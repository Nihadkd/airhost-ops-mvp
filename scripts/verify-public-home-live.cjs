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

    const searchVisible = await page.locator("#public-search").isVisible().catch(() => false);
    const sloganVisible = await page.getByText("Finn hjelp, eller tjen penger på å hjelpe andre").isVisible().catch(() => false);
    const jobsHeadingVisible = await page.getByText("Ledige oppdrag").isVisible().catch(() => false);
    const loginButtonVisible = await page.getByRole("link", { name: "Logg inn" }).isVisible().catch(() => false);

    await page.screenshot({
      path: path.join(outputDir, "public-home-live.png"),
      fullPage: true,
    });

    console.log(JSON.stringify({
      url: page.url(),
      searchVisible,
      sloganVisible,
      jobsHeadingVisible,
      loginButtonVisible,
      screenshot: path.join("output", "playwright", "public-home-live.png"),
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
