const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE_URL = "https://servnest.no";
const ADMIN_EMAIL = "admin@airhost.no";
const ADMIN_PASSWORD = "Admin123!";

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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  try {
    await login(page);
    await page.goto(`${BASE_URL}/orders/new`, { waitUntil: "networkidle" });

    const typeSelect = page.locator('select[name="type"]');
    await typeSelect.selectOption("CLEANING");
    await page.waitForTimeout(300);
    const hasGuestCountForCleaning = await page.locator('input[name="guestCount"]').isVisible().catch(() => false);

    await typeSelect.selectOption("KEY_HANDLING");
    await page.waitForTimeout(300);
    const hasGuestCountForAirbnb = await page.locator('input[name="guestCount"]').isVisible().catch(() => false);

    await page.screenshot({
      path: path.join(outputDir, "airbnb-fields-live.png"),
      fullPage: true,
    });

    console.log(JSON.stringify({
      hasGuestCountForCleaning,
      hasGuestCountForAirbnb,
      screenshot: path.join("output", "playwright", "airbnb-fields-live.png"),
      url: `${BASE_URL}/orders/new`,
    }));
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
