const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

async function main() {
  const outputDir = path.join(process.cwd(), "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });

  let versionInterceptCount = 0;

  await context.route("**/api/version**", async (route) => {
    versionInterceptCount += 1;

    if (versionInterceptCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
        },
        body: JSON.stringify({ version: `forced-mismatch-${Date.now()}` }),
      });
      return;
    }

    await route.continue();
  });

  const page = await context.newPage();

  try {
    await page.goto("https://servnest.no/login", { waitUntil: "domcontentloaded" });

    await page.waitForSelector("text=Ny versjon tilgjengelig", { timeout: 10_000 });
    const overlayScreenshot = path.join(outputDir, "version-refresh-overlay-live.png");
    await page.screenshot({ path: overlayScreenshot, fullPage: true });

    await page.waitForURL(/__refresh=\d+/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    const refreshedScreenshot = path.join(outputDir, "version-refresh-after-reload-live.png");
    await page.screenshot({ path: refreshedScreenshot, fullPage: true });

    const overlayVisibleAfterReload = await page.locator("text=Ny versjon tilgjengelig").isVisible().catch(() => false);

    console.log(
      JSON.stringify(
        {
          versionInterceptCount,
          finalUrl: page.url(),
          usedRefreshQuery: /[?&]__refresh=\d+/.test(page.url()),
          overlayVisibleAfterReload,
          overlayScreenshot: path.join("output", "playwright", "version-refresh-overlay-live.png"),
          refreshedScreenshot: path.join("output", "playwright", "version-refresh-after-reload-live.png"),
        },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
