import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "https://nextjs-saas-v1.vercel.app";
const adminEmail = process.env.VERIFY_ADMIN_EMAIL ?? "admin@airhost.no";
const adminPassword = process.env.VERIFY_ADMIN_PASSWORD ?? "Admin123!";
const id = Math.random().toString(36).slice(2, 8);
const testEmail = `delete-check-${id}@example.com`;
const testName = `Delete Check ${id}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill(adminEmail);
  await page.locator('input[name="password"]').fill(adminPassword);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), null, { timeout: 30000 }).catch(async () => {
    await page.screenshot({ path: "artifacts/admin-login-failed.png", fullPage: true });
    throw new Error("Admin login did not leave /login");
  });
  await page.evaluate(() => {
    document.querySelectorAll('div.fixed.inset-0.z-\\[70\\]').forEach((node) => node.remove());
  });

  await page.goto(`${baseUrl}/admin/users`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    document.querySelectorAll('div.fixed.inset-0.z-\\[70\\]').forEach((node) => node.remove());
  });

  // Create user
  await page.locator('input[name="name"]').fill(testName);
  await page.locator('input[name="email"]').fill(testEmail);
  await page.locator('input[name="phone"]').fill("+4791122334");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.locator('select[name="role"]').selectOption("UTLEIER");
  const createResponsePromise = page.waitForResponse(
    (res) => res.url().includes("/api/users") && res.request().method() === "POST",
    { timeout: 30000 },
  );
  await page.locator('form button[type="submit"]').click();
  const createRes = await createResponsePromise;
  const createBody = await createRes.text().catch(() => "");
  if (!createRes.ok()) {
    await page.screenshot({ path: "artifacts/admin-create-user-failed.png", fullPage: true });
    throw new Error(`Create user failed: ${createRes.status()} ${createBody}`);
  }

  const row = page.locator("tr", { hasText: testEmail }).first();
  await row.waitFor({ timeout: 30000 });

  // Delete user
  await row.locator("button", { hasText: /Slett bruker|Delete user/i }).click();

  // Wait until removed from table
  await page.waitForFunction(
    (email) => !document.body.innerText.includes(email),
    testEmail,
    { timeout: 30000 },
  );

  await page.screenshot({ path: "artifacts/admin-delete-user-ok.png", fullPage: true });
  console.log(JSON.stringify({ ok: true, deletedEmail: testEmail }));
} finally {
  await browser.close();
}
