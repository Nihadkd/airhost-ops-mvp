import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "https://nextjs-saas-v1.vercel.app";
const adminEmail = process.env.VERIFY_ADMIN_EMAIL ?? "admin@airhost.no";
const adminPassword = process.env.VERIFY_ADMIN_PASSWORD ?? "Admin123!";
const id = Math.random().toString(36).slice(2, 8);
const testEmail = `delete-api-${id}@example.com`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
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
        name: "Delete API Check",
        email,
        phone: "+4791231234",
        password: "Password123!",
        role: "UTLEIER",
      }),
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  }, { email: testEmail });

  if (!created.ok || !created.body?.id) {
    throw new Error(`Create failed: ${created.status} ${JSON.stringify(created.body)}`);
  }

  const deleted = await page.evaluate(async ({ userId }) => {
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  }, { userId: created.body.id });

  if (!deleted.ok) {
    throw new Error(`Delete failed: ${deleted.status} ${JSON.stringify(deleted.body)}`);
  }

  const stillExists = await page.evaluate(async ({ email }) => {
    const res = await fetch("/api/users", { cache: "no-store" });
    if (!res.ok) return true;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.some((row) => row?.email === email);
  }, { email: testEmail });

  if (stillExists) {
    throw new Error("Deleted user still exists in /api/users");
  }

  console.log(JSON.stringify({ ok: true, deletedEmail: testEmail }));
} finally {
  await browser.close();
}
