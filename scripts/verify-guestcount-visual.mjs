import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000";
const id = Math.random().toString(36).slice(2, 8);
const email = `guestcount-${id}@example.com`;
const password = "Password123!";
const phone = "+47999999" + Math.floor(Math.random() * 10).toString();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const closeOnboardingIfPresent = async () => {
    await page.evaluate(() => {
      const overlay = document.querySelector('div.fixed.inset-0.z-\\[70\\]');
      if (!overlay) return;
      const button = overlay.querySelector("button");
      if (button instanceof HTMLElement) button.click();
    });
  };

  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Guest Count ${id}`,
      email,
      phone,
      password,
      role: "UTLEIER",
    }),
  });
  if (!registerRes.ok) {
    const body = await registerRes.text();
    throw new Error(`Register failed: ${registerRes.status} ${body}`);
  }

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 20000 });
  const onboardingNo = page.getByRole("button", { name: "Kom i gang" });
  const onboardingEn = page.getByRole("button", { name: "Get started" });
  if (await onboardingNo.isVisible().catch(() => false)) {
    await onboardingNo.click();
  } else if (await onboardingEn.isVisible().catch(() => false)) {
    await onboardingEn.click();
  }
  await closeOnboardingIfPresent();

  await page.goto(`${baseUrl}/orders/new`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await closeOnboardingIfPresent();
  const card = page.locator('label:has(input[name="guestCount"]) > div').first();
  await card.waitFor({ timeout: 15000 });
  const box = await card.boundingBox();
  if (!box) throw new Error("Could not measure guest count card");

  await page.screenshot({ path: "artifacts/guestcount-visual.png", fullPage: true });

  console.log(JSON.stringify({ width: Math.round(box.width), height: Math.round(box.height) }));
} finally {
  await browser.close();
}
