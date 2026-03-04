import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "https://nextjs-saas-v1.vercel.app";
const adminEmail = process.env.VERIFY_ADMIN_EMAIL ?? "admin@airhost.no";
const adminPassword = process.env.VERIFY_ADMIN_PASSWORD ?? "Admin123!";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill(adminEmail);
  await page.locator('input[name="password"]').fill(adminPassword);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), null, { timeout: 30000 });

  await page.locator('button[title="Meny"], button[title="Menu"]').click();
  const hasUsers = await page.locator('a[href="/admin/users"]').isVisible();
  const hasDeleteUsers = await page.locator('a[href="/admin/users#delete"]').isVisible().catch(() => false);
  const hasPrices = await page.locator('a[href="/prices"]').isVisible();
  if (!hasUsers || hasDeleteUsers || !hasPrices) {
    throw new Error(`Missing menu items users=${hasUsers} deleteUsers=${hasDeleteUsers} prices=${hasPrices}`);
  }

  await page.goto(`${baseUrl}/prices`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const pricesVisible = await page.locator("text=Pakkepris").isVisible().catch(() => false);
  if (!pricesVisible) {
    throw new Error("Admin could not access prices content");
  }

  await page.goto(`${baseUrl}/admin/users`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const hasFullOverviewTitle = await page.locator("h1", { hasText: /Full brukeroversikt/i }).isVisible().catch(() => false);
  if (!hasFullOverviewTitle) {
    throw new Error("Missing 'Full brukeroversikt' title on /admin/users");
  }
  const headers = await page.locator("thead th").allTextContents();
  const requiredHeaders = ["ID", "E-post", "Telefon", "Tilganger", "Aktiv modus", "Opprettet"];
  for (const header of requiredHeaders) {
    if (!headers.some((h) => h.toLowerCase().includes(header.toLowerCase()))) {
      throw new Error(`Missing required users header: ${header}`);
    }
  }
  const rowCount = await page.locator("tbody tr").count();
  const deleteButtonCount = await page
    .locator('tbody tr button:has-text("Slett bruker"), tbody tr button:has-text("Delete user")')
    .count();
  if (rowCount < 1 || deleteButtonCount < 1 || deleteButtonCount !== rowCount) {
    throw new Error(`Delete button mismatch rows=${rowCount} deleteButtons=${deleteButtonCount}`);
  }

  await page.screenshot({ path: "artifacts/admin-menu-access-ok.png", fullPage: true });
  console.log(JSON.stringify({ ok: true, users: hasUsers, deleteUsers: hasDeleteUsers, prices: hasPrices, rowCount, deleteButtonCount, hasFullOverviewTitle, headers }));
} finally {
  await browser.close();
}
