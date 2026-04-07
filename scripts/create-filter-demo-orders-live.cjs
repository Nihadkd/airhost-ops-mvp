const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { buildDemoOrderPayloads } = require("./filter-demo-orders-data.cjs");

const BASE_URL = "https://servnest.no";
const ADMIN_EMAIL = "admin@airhost.no";
const ADMIN_PASSWORD = "Admin123!";
const LANDLORD_ID = "cmlqvblho0000l404c7n30tkf";

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /logg inn|sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

async function run() {
  const outputDir = path.join(process.cwd(), "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  try {
    await login(page);

    const orders = buildDemoOrderPayloads();
    const result = await page.evaluate(async ({ landlordId, orders }) => {
      const existingResponse = await fetch("/api/orders", { cache: "no-store" });
      const existingOrders = existingResponse.ok ? await existingResponse.json() : [];
      const existingAddresses = new Set(
        Array.isArray(existingOrders) ? existingOrders.filter((order) => order?.status !== "COMPLETED").map((order) => order.address) : [],
      );

      const created = [];
      const skipped = [];
      const failed = [];

      for (const order of orders) {
        if (existingAddresses.has(order.address)) {
          skipped.push({ key: order.key, address: order.address });
          continue;
        }

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            landlordId,
            type: order.type,
            address: order.address,
            date: order.date,
            deadlineAt: order.deadlineAt,
            note: order.note,
            details: order.details,
            guestCount: order.guestCount,
          }),
        });

        const data = await response.json().catch(() => null);
        if (response.ok) {
          created.push({
            key: order.key,
            countyLabel: order.countyLabel,
            categoryLabelNo: order.categoryLabelNo,
            id: data?.id ?? null,
            orderNumber: data?.orderNumber ?? null,
            address: order.address,
          });
          existingAddresses.add(order.address);
        } else {
          failed.push({
            key: order.key,
            status: response.status,
            address: order.address,
            body: data,
          });
        }
      }

      return {
        created,
        skipped,
        failed,
      };
    }, { landlordId: LANDLORD_ID, orders });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(outputDir, "filter-demo-orders-live-home.png"),
      fullPage: true,
    });

    const artifact = {
      ...result,
      baseUrl: BASE_URL,
      screenshot: path.join("output", "playwright", "filter-demo-orders-live-home.png"),
    };
    fs.writeFileSync(path.join(outputDir, "filter-demo-orders-live.json"), JSON.stringify(artifact, null, 2));
    console.log(JSON.stringify(artifact, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
