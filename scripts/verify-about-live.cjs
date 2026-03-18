const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE_URL = "https://servnest.no";

async function run() {
  const outputDir = path.join(process.cwd(), "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Om oss" }).click();
    await page.waitForURL(`${BASE_URL}/om-oss`, { timeout: 15000 });

    const headingVisible = await page.getByText("Velkommen til ServNest").isVisible().catch(() => false);
    const phoneVisible = await page.getByText("+47 973 91 486").isVisible().catch(() => false);
    const emailVisible = await page.getByText("Servn3st@gmail.com").isVisible().catch(() => false);

    await page.screenshot({
      path: path.join(outputDir, "about-live.png"),
      fullPage: true,
    });

    console.log(JSON.stringify({
      url: page.url(),
      headingVisible,
      phoneVisible,
      emailVisible,
      screenshot: path.join("output", "playwright", "about-live.png"),
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
