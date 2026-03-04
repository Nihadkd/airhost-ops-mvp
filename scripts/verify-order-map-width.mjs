import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "https://nextjs-saas-v1.vercel.app";
const id = Math.random().toString(36).slice(2, 8);
const email = `mapwidth-${id}@example.com`;
const password = "Password123!";
const phone = "+47999999" + Math.floor(Math.random() * 10).toString();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Map Width ${id}`,
      email,
      phone,
      password,
      role: "UTLEIER",
    }),
  });
  if (!registerRes.ok) {
    throw new Error(`Register failed: ${registerRes.status}`);
  }

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 30000 });

  // Avoid onboarding overlay intercepting clicks.
  await page.evaluate(() => {
    document.querySelectorAll('div.fixed.inset-0.z-\\[70\\]').forEach((node) => node.remove());
  });

  const createRes = await page.evaluate(async () => {
    const payload = {
      type: "CLEANING",
      address: `Kart Testvei ${Math.floor(Math.random() * 999)}`,
      date: new Date(Date.now() + 86400000).toISOString(),
      note: "map width verify",
      guestCount: 2,
    };
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, body };
  });

  if (!createRes.ok || !createRes.body?.id) {
    throw new Error("Could not create order for verification");
  }

  await page.goto(`${baseUrl}/orders/${createRes.body.id}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const mapCard = page.locator('a[title="Kart"], a[title="Map"]').first();
  await mapCard.waitFor({ timeout: 20000 });
  const box = await mapCard.boundingBox();
  if (!box) throw new Error("Map card not measurable");

  await page.screenshot({ path: "artifacts/order-map-width.png", fullPage: true });
  console.log(JSON.stringify({ width: Math.round(box.width), height: Math.round(box.height) }));
} finally {
  await browser.close();
}
