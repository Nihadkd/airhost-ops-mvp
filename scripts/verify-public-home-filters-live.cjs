const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { buildDemoOrderPayloads } = require("./filter-demo-orders-data.cjs");

const BASE_URL = "https://servnest.no";

async function hasVisibleExactText(page, text) {
  const matches = page.getByText(text, { exact: true });
  const count = await matches.count();

  for (let index = 0; index < count; index += 1) {
    if (await matches.nth(index).isVisible().catch(() => false)) {
      return true;
    }
  }

  return false;
}

async function run() {
  const outputDir = path.join(process.cwd(), "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1600 } });
  const page = await context.newPage();

  try {
    const orders = buildDemoOrderPayloads();
    const countyChecks = [];
    const categoryChecks = [];
    const categorySamples = [];
    const seenCategories = new Set();

    for (const order of orders) {
      if (order.type === "KEY_HANDLING") continue;
      if (seenCategories.has(order.categoryLabelNo)) continue;
      seenCategories.add(order.categoryLabelNo);
      categorySamples.push(order);
    }

    await page.goto(`${BASE_URL}/#ledige-oppdrag`, { waitUntil: "networkidle" });
    const filterSummary = page.locator("#ledige-oppdrag summary").first();
    const countySelect = page.locator("#ledige-oppdrag select").first();

    await page.locator("#ledige-oppdrag").scrollIntoViewIfNeeded();
    await filterSummary.click();
    await countySelect.waitFor({ state: "visible", timeout: 10000 });

    for (const order of orders) {
      await countySelect.selectOption({ label: order.countyLabel });
      await page.waitForTimeout(250);

      const isVisible = await hasVisibleExactText(page, order.address);
      countyChecks.push({
        county: order.countyLabel,
        expectedAddress: order.address,
        visible: isVisible,
      });
    }

    await countySelect.selectOption({ label: "Alle fylker" });
    await page.waitForTimeout(250);

    for (const order of categorySamples) {
      await page.getByRole("button", { name: /Alle tjenester/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: new RegExp(order.categoryLabelNo, "i") }).click();
      await page.waitForTimeout(250);

      const isVisible = await hasVisibleExactText(page, order.address);
      categoryChecks.push({
        category: order.categoryLabelNo,
        expectedAddress: order.address,
        visible: isVisible,
      });
    }

    await page.getByRole("button", { name: /Alle tjenester/i }).click();
    await countySelect.selectOption({ label: "Vestland" });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(outputDir, "public-home-filters-live.png"),
      fullPage: true,
    });

    const artifact = {
      baseUrl: BASE_URL,
      countyChecks,
      categoryChecks,
      screenshot: path.join("output", "playwright", "public-home-filters-live.png"),
      allCountyChecksPassed: countyChecks.every((check) => check.visible),
      allCategoryChecksPassed: categoryChecks.every((check) => check.visible),
    };

    fs.writeFileSync(path.join(outputDir, "public-home-filters-live.json"), JSON.stringify(artifact, null, 2));
    console.log(JSON.stringify(artifact, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
