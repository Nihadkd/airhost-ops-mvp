import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "https://nextjs-saas-v1.vercel.app";
const adminEmail = process.env.VERIFY_ADMIN_EMAIL ?? "admin@airhost.no";
const adminPassword = process.env.VERIFY_ADMIN_PASSWORD ?? "Admin123!";
const id = Math.random().toString(36).slice(2, 8);
const testEmail = `delete-ui-${id}@example.com`;

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
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), null, { timeout: 30000 });

  const created = await page.evaluate(async ({ email }) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Delete UI Check",
        email,
        phone: "+4792232234",
        password: "Password123!",
        role: "UTLEIER",
      }),
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  }, { email: testEmail });
  if (!created.ok || !created.body?.id) {
    throw new Error(`Create failed: ${created.status}`);
  }

  await page.goto(`${baseUrl}/admin/users`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const row = page.locator("tr", { hasText: testEmail }).first();
  await row.waitFor({ timeout: 30000 });
  await row.locator("button", { hasText: /Slett bruker|Delete user/i }).click({ force: true });

  await page.waitForFunction(
    (email) => !document.body.innerText.includes(email),
    testEmail,
    { timeout: 30000 },
  );

  await page.screenshot({ path: "artifacts/admin-delete-user-ui-ok.png", fullPage: true });
  console.log(JSON.stringify({ ok: true, deletedEmail: testEmail }));
} finally {
  await browser.close();
}
