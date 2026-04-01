const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE_URL = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_EMAIL = process.env.VERIFY_ADMIN_EMAIL || "admin@airhost.no";
const ADMIN_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD || "Admin123!";
const LANDLORD_LABEL = process.env.VERIFY_LANDLORD_LABEL || "Nora Utleier (utleier@airhost.no)";

function isoDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertVisible(locator, message) {
  const visible = await locator
    .waitFor({ state: "visible", timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) {
    throw new Error(message);
  }
}

async function assertBodyContains(page, pattern, message) {
  const matched = await page
    .locator("body")
    .textContent()
    .then((text) => pattern.test(text || ""))
    .catch(() => false);

  if (!matched) {
    throw new Error(message);
  }
}

async function waitForBodyContains(page, pattern, message, timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const matched = await page
      .locator("body")
      .textContent()
      .then((text) => pattern.test(text || ""))
      .catch(() => false);

    if (matched) {
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error(message);
}

async function run() {
  const outputDir = path.join(process.cwd(), "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const screenshotPath = path.join(outputDir, "local-ui-verify.png");
  const mobileScreenshotPath = path.join(outputDir, "local-ui-home-mobile.png");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const mobilePage = await mobileContext.newPage();

  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  let createdOrder = null;
  let redirectedAfterCreate = false;

  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("requestfailed", (request) => {
    if (request.url().includes("/_next/webpack-hmr")) return;
    const errorText = request.failure()?.errorText || "unknown";
    if (errorText.includes("ERR_ABORTED")) return;
    if (request.url().startsWith(BASE_URL)) {
      failedRequests.push({ url: request.url(), errorText });
    }
  });

  page.on("response", async (response) => {
    const url = response.url();
    if (!url.startsWith(BASE_URL)) return;
    if (!url.includes("/api/")) return;
    if (response.status() < 500) return;

    let body = null;
    try {
      body = await response.text();
    } catch {
      body = null;
    }
    failedRequests.push({ url, status: response.status(), body });
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "commit", timeout: 60000 });
    await assertVisible(page.locator("#public-search"), "Public search field is missing on the home page");
    await assertBodyContains(page, /Ledige oppdrag/i, "Home page jobs section is missing");
    await assertVisible(page.getByRole("link", { name: /Logg inn|Login/i }), "Login link is missing on the home page");

    await mobilePage.goto(BASE_URL, { waitUntil: "commit", timeout: 60000 });
    await assertBodyContains(mobilePage, /Ledige oppdrag/i, "Home page does not render on mobile");
    await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: true });

    await page.goto(`${BASE_URL}/login?callbackUrl=${encodeURIComponent("/dashboard")}`, { waitUntil: "commit", timeout: 60000 });
    await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 20000, waitUntil: "commit" }),
      page.getByRole("button", { name: /logg inn|sign in/i }).click(),
    ]);

    await page.goto(`${BASE_URL}/orders/new`, { waitUntil: "commit", timeout: 60000 });

    const uniqueAddress = `Automated UI verify ${Date.now()}, Oslo`;
    await page.locator('textarea[name="note"]').fill("Automated end-to-end verification order");
    await page.locator('textarea[name="details"]').fill("Created during local UI verification to prove the main flow works.");
    await page.locator('input[list="landlord-options"]').fill(LANDLORD_LABEL);
    await page.locator('input[name="date"]').fill(isoDateOffset(1));
    await page.locator('select[name="time"]').selectOption("12:00");
    await page.locator('input[name="deadlineDate"]').fill(isoDateOffset(1));
    await page.locator('select[name="deadlineTime"]').selectOption("14:00");
    await page.locator('input[name="address"]').fill(uniqueAddress);

    await page.locator('button[type="submit"]').click();
    redirectedAfterCreate = await page
      .waitForURL(/\/dashboard/, { timeout: 10000, waitUntil: "commit" })
      .then(() => true)
      .catch(() => false);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const ordersResponse = await context.request.get(`${BASE_URL}/api/orders`, { failOnStatusCode: true });
      const orders = await ordersResponse.json();
      createdOrder = Array.isArray(orders) ? orders.find((order) => order.address === uniqueAddress) : null;
      if (createdOrder?.id) {
        break;
      }
      await page.waitForTimeout(1000);
    }

    if (!createdOrder?.id) {
      const bodyText = await page.locator("body").textContent().catch(() => "");
      throw new Error(`Created order was not persisted. URL: ${page.url()} Body: ${bodyText}`);
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const dashboardResponse = await context.request.get(`${BASE_URL}/api/dashboard?sort=NEWEST_OLDEST&page=1&pageSize=20`, {
        failOnStatusCode: true,
      });
      const dashboardPayload = await dashboardResponse.json();
      const dashboardOrders = Array.isArray(dashboardPayload?.orders) ? dashboardPayload.orders : [];
      if (dashboardOrders.some((order) => order.address === uniqueAddress)) {
        break;
      }
      if (attempt === 9) {
        throw new Error("Created order was persisted but never appeared in /api/dashboard");
      }
      await page.waitForTimeout(1000);
    }

    const dashboardResponsePromise = page.waitForResponse((response) => {
      return response.url().startsWith(`${BASE_URL}/api/dashboard`) && response.request().method() === "GET" && response.ok();
    }, { timeout: 20000 }).catch(() => null);
    await page.goto(`${BASE_URL}/dashboard?sort=NEWEST_OLDEST`, { waitUntil: "commit", timeout: 60000 });
    await dashboardResponsePromise;
    await waitForBodyContains(page, new RegExp(escapeRegExp(uniqueAddress), "i"), "Created order is not visible on the dashboard");

    await page.screenshot({ path: screenshotPath, fullPage: true });

    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected: ${pageErrors.join(" | ")}`);
    }
    if (failedRequests.length > 0) {
      throw new Error(`Failed local requests detected: ${JSON.stringify(failedRequests)}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Console errors detected: ${consoleErrors.join(" | ")}`);
    }

    console.log(JSON.stringify({
      baseUrl: BASE_URL,
      homeVerified: true,
      mobileHomeVerified: true,
      loginVerified: true,
      orderCreateVerified: true,
      redirectAfterCreateVerified: redirectedAfterCreate,
      createdOrderId: createdOrder.id,
      createdOrderAddress: uniqueAddress,
      screenshot: path.join("output", "playwright", "local-ui-verify.png"),
      mobileScreenshot: path.join("output", "playwright", "local-ui-home-mobile.png"),
    }));
  } finally {
    if (createdOrder?.id) {
      await context.request.delete(`${BASE_URL}/api/orders/${createdOrder.id}`).catch(() => {});
    }
    await mobileContext.close();
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
