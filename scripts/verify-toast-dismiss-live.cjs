const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "https://servnest.no";
const ADMIN_EMAIL = "admin@airhost.no";
const ADMIN_PASSWORD = "Admin123!";
const LANDLORD_ID = "cmlqvblho0000l404c7n30tkf";

async function createTestOrder(page, suffix) {
  const response = await page.evaluate(async ({ landlordId, suffix }) => {
    const startAt = new Date();
    startAt.setUTCDate(startAt.getUTCDate() + 1);
    startAt.setUTCMinutes(startAt.getUTCMinutes() < 30 ? 30 : 0, 0, 0);
    if (startAt.getUTCMinutes() === 0) startAt.setUTCHours(startAt.getUTCHours() + 1);

    const deadlineAt = new Date(startAt);
    deadlineAt.setUTCHours(deadlineAt.getUTCHours() + 2);
    const address = `Toast test ${suffix}, Oslo`;

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landlordId,
        type: "CLEANING",
        address,
        date: startAt.toISOString(),
        deadlineAt: deadlineAt.toISOString(),
        guestCount: 1,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`create failed ${res.status} ${JSON.stringify(data)}`);
    return data;
  }, { landlordId: LANDLORD_ID, suffix });

  return response;
}

async function run() {
  const outputDir = path.join(process.cwd(), "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const createdOrders = [];

  const cleanupOrders = async () => {
    for (const order of createdOrders) {
      try {
        await page.evaluate(async ({ orderId }) => {
          await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
        }, { orderId: order.id });
      } catch {}
    }
  };

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /logg inn|sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });

    createdOrders.push(await createTestOrder(page, `${Date.now()}-a`));
    createdOrders.push(await createTestOrder(page, `${Date.now()}-b`));

    await page.goto(`${BASE_URL}/orders/my?status=all`, { waitUntil: "networkidle" });
    for (const order of createdOrders) {
      const row = page.locator("tr").filter({ hasText: `#${order.orderNumber}` }).first();
      await row.waitFor({ state: "visible", timeout: 15000 });
      await row.locator('input[type="checkbox"]').check();
    }

    await page.getByRole("button", { name: /^pågår$|^in progress$/i }).click();
    const firstToast = page.locator('[data-rht-toaster] [role="status"]').first();
    await firstToast.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(7000);
    const autoToastState = await page.evaluate(() => {
      const el = document.querySelector('[data-rht-toaster] [role="status"]');
      if (!el) return { exists: false, text: "", opacity: "" };
      const style = window.getComputedStyle(el);
      return { exists: true, text: el.textContent ?? "", opacity: style.opacity };
    });
    const autoDismissed = !autoToastState.exists;

    for (const order of createdOrders) {
      const row = page.locator("tr").filter({ hasText: `#${order.orderNumber}` }).first();
      const checkbox = row.locator('input[type="checkbox"]');
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
    }

    await page.getByRole("button", { name: /^venter$|^pending$/i }).click();
    const secondToast = page.locator('[data-rht-toaster] [role="status"]').first();
    await secondToast.waitFor({ state: "visible", timeout: 15000 });
    const box = await secondToast.boundingBox();
    if (!box) throw new Error("Toast box not found");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    const swipeToastState = await page.evaluate(() => {
      const el = document.querySelector('[data-rht-toaster] [role="status"]');
      if (!el) return { exists: false, text: "", opacity: "" };
      const style = window.getComputedStyle(el);
      return { exists: true, text: el.textContent ?? "", opacity: style.opacity };
    });
    const swipeDismissed = !swipeToastState.exists;

    await page.screenshot({
      path: path.join(outputDir, "toast-dismiss-live.png"),
      fullPage: true,
    });

    console.log(JSON.stringify({
      autoDismissed,
      autoToastState,
      swipeDismissed,
      swipeToastState,
      screenshot: path.join("output", "playwright", "toast-dismiss-live.png"),
      url: `${BASE_URL}/orders/my?status=all`,
    }));
  } finally {
    await cleanupOrders();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
