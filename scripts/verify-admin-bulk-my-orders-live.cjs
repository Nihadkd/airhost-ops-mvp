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
    const address = `My orders bulk test ${suffix}, Oslo`;

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
    if (!res.ok) {
      const ordersRes = await fetch("/api/orders", { cache: "no-store" });
      const orders = ordersRes.ok ? await ordersRes.json() : [];
      const fallbackOrder = Array.isArray(orders)
        ? orders.find((order) => order.address === address)
        : null;
      return { ok: Boolean(fallbackOrder), order: fallbackOrder, status: res.status, data };
    }

    return { ok: true, order: data, status: res.status, data };
  }, { landlordId: LANDLORD_ID, suffix });

  if (!response.ok) {
    throw new Error(`Could not create test order: ${response.status} ${JSON.stringify(response.data)}`);
  }

  return response.order;
}

async function run() {
  const outputDir = path.join(process.cwd(), "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const createdOrders = [];
  const timestamp = Date.now();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /logg inn|sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });

    createdOrders.push(await createTestOrder(page, `${timestamp}-a`));
    createdOrders.push(await createTestOrder(page, `${timestamp}-b`));

    await page.goto(`${BASE_URL}/orders/my?status=all`, { waitUntil: "networkidle" });

    for (const order of createdOrders) {
      const row = page.locator("tr").filter({ hasText: `#${order.orderNumber}` }).first();
      await row.waitFor({ state: "visible", timeout: 15000 });
      await row.locator('input[type="checkbox"]').check();
    }

    await page.getByText(/2 valgte|2 selected/i).waitFor({ state: "visible", timeout: 15000 });
    const hasMyOrdersBulkControls =
      await page.getByRole("button", { name: /^venter$|^pending$/i }).isVisible() &&
      await page.getByRole("button", { name: /^pågår$|^in progress$/i }).isVisible() &&
      await page.getByRole("button", { name: /^fullført$|^completed$/i }).isVisible() &&
      await page.getByRole("button", { name: /slett valgte|delete selected/i }).isVisible();

    await page.screenshot({
      path: path.join(outputDir, "admin-my-orders-bulk-controls-live.png"),
      fullPage: true,
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    const hasDashboardBulkControls = await page.getByText(/valgte|selected/i).count();

    console.log(JSON.stringify({
      createdOrderNumbers: createdOrders.map((order) => order.orderNumber),
      hasMyOrdersBulkControls,
      hasDashboardBulkControls: hasDashboardBulkControls > 0,
      screenshot: path.join("output", "playwright", "admin-my-orders-bulk-controls-live.png"),
      myOrdersUrl: `${BASE_URL}/orders/my?status=all`,
      dashboardUrl: `${BASE_URL}/dashboard`,
    }));
  } finally {
    for (const order of createdOrders) {
      try {
        await page.request.delete(`${BASE_URL}/api/orders/${order.id}`);
      } catch {}
    }
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
