const { chromium } = require("playwright");

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
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let createdOrderId = null;

  try {
    await login(page);

    const result = await page.evaluate(async ({ landlordId }) => {
      const startAt = new Date();
      startAt.setUTCDate(startAt.getUTCDate() + 1);
      startAt.setUTCHours(12, 0, 0, 0);
      const deadlineAt = new Date(startAt);
      deadlineAt.setUTCHours(deadlineAt.getUTCHours() + 2);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landlordId,
          type: "MOVING_CARRYING",
          address: `Service type live test ${Date.now()}, Oslo`,
          date: startAt.toISOString(),
          deadlineAt: deadlineAt.toISOString(),
          note: "temporary verification order",
        }),
      });

      const data = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, data };
    }, { landlordId: LANDLORD_ID });

    if (result.ok && result.data?.id) {
      createdOrderId = result.data.id;
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (createdOrderId) {
      await page.evaluate(async ({ orderId }) => {
        await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      }, { orderId: createdOrderId }).catch(() => {});
    }
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
