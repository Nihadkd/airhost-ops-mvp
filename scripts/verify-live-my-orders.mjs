import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "https://servnest.no";
const email = process.env.VERIFY_EMAIL ?? "utleier@airhost.no";
const password = process.env.VERIFY_PASSWORD ?? "Utleier123!";
const screenshotPath = process.env.VERIFY_SCREENSHOT_PATH ?? "artifacts/live-my-orders.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle", { timeout: 30000 });

  await page.goto(`${baseUrl}/orders/my`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 });

  const bodyText = await page.locator("body").innerText();
  const signInFailedVisible = await page.getByText("Sign-in failed. Please try again.", { exact: false }).isVisible().catch(() => false);
  const genericErrorVisible = await page.getByText("Something went wrong. Please try again.", { exact: false }).isVisible().catch(() => false);
  const noJobsVisible = await page.getByText("No jobs yet.", { exact: false }).isVisible().catch(() => false);
  const jobsCountText = await page.getByText(/Jobs:\s*\d+/).textContent().catch(() => null);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(
    JSON.stringify({
      ok: true,
      email,
      currentUrl: page.url(),
      signInFailedVisible,
      genericErrorVisible,
      noJobsVisible,
      jobsCountText,
      bodySnippet: bodyText.slice(0, 1000),
      screenshotPath,
    }),
  );
} finally {
  await browser.close();
}
