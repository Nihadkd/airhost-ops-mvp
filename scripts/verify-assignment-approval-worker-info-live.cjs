const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "https://servnest.no";
const ADMIN_EMAIL = "admin@airhost.no";
const ADMIN_PASSWORD = "Admin123!";
const LANDLORD_ID = "cmlqvblho0000l404c7n30tkf";

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /logg inn|sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

async function createTestOrder(page, suffix) {
  const response = await page.evaluate(async ({ landlordId, suffix }) => {
    const startAt = new Date();
    startAt.setUTCDate(startAt.getUTCDate() + 1);
    startAt.setUTCMinutes(startAt.getUTCMinutes() < 30 ? 30 : 0, 0, 0);
    if (startAt.getUTCMinutes() === 0) startAt.setUTCHours(startAt.getUTCHours() + 1);

    const deadlineAt = new Date(startAt);
    deadlineAt.setUTCHours(deadlineAt.getUTCHours() + 2);
    const address = `Approval worker info test ${suffix}, Oslo`;

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landlordId,
        type: "CLEANING",
        address,
        date: startAt.toISOString(),
        deadlineAt: deadlineAt.toISOString(),
        guestCount: 1,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`create failed ${res.status} ${JSON.stringify(data)}`);
    return data;
  }, { landlordId: LANDLORD_ID, suffix });

  return response;
}

async function createWorker(page, suffix) {
  return page.evaluate(async ({ suffix }) => {
    const email = `worker-approval-${suffix}@airhost.no`;
    const password = "Worker123!";
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Worker Approval ${suffix}`,
        email,
        phone: "+4791111111",
        password,
        role: "TJENESTE",
        canLandlord: false,
        canService: true,
        activeMode: "TJENESTE",
        isActive: true,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`worker create failed ${res.status} ${JSON.stringify(data)}`);
    return { ...data, password };
  }, { suffix });
}

async function assignWorker(page, orderId, workerId) {
  await page.evaluate(async ({ orderId, workerId }) => {
    const res = await fetch(`/api/orders/${orderId}/assign`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: workerId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`assign failed ${res.status} ${JSON.stringify(data)}`);
  }, { orderId, workerId });
}

async function acceptAssignment(page, orderId) {
  await page.evaluate(async ({ orderId }) => {
    const res = await fetch(`/api/orders/${orderId}/assignment/accept`, { method: "PUT" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`accept failed ${res.status} ${JSON.stringify(data)}`);
  }, { orderId });
}

async function deleteOrder(page, orderId) {
  try {
    await page.evaluate(async ({ orderId }) => {
      await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    }, { orderId });
  } catch {}
}

async function deleteUser(page, userId) {
  try {
    await page.evaluate(async ({ userId }) => {
      await fetch(`/api/users/${userId}`, { method: "DELETE" });
    }, { userId });
  } catch {}
}

async function run() {
  const outputDir = path.join(process.cwd(), "output", "playwright");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext();
  const workerContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const workerPage = await workerContext.newPage();
  let order = null;
  let worker = null;

  try {
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    worker = await createWorker(adminPage, String(Date.now()));
    order = await createTestOrder(adminPage, String(Date.now()));
    await assignWorker(adminPage, order.id, worker.id);

    await login(workerPage, worker.email, worker.password);
    await acceptAssignment(workerPage, order.id);

    await adminPage.goto(`${BASE_URL}/orders/${order.id}`, { waitUntil: "networkidle" });
    const approvalSection = adminPage.locator("div").filter({ has: adminPage.getByRole("button", { name: /godkjenn tjenesteutforer|approve worker/i }) }).first();
    await approvalSection.waitFor({ state: "visible", timeout: 15000 });

    const workerNameVisible = await approvalSection.getByText(worker.name, { exact: false }).first().isVisible();
    const approvalSectionText = await approvalSection.textContent();
    const hasRatingOrFallback =
      /ingen .* ennå|no .* yet|★/i.test(approvalSectionText ?? "");

    await adminPage.screenshot({
      path: path.join(outputDir, "assignment-approval-worker-info-live.png"),
      fullPage: true,
    });

    console.log(JSON.stringify({
      orderId: order.id,
      orderNumber: order.orderNumber,
      workerNameVisible,
      approvalSectionText,
      hasRatingOrFallback,
      screenshot: path.join("output", "playwright", "assignment-approval-worker-info-live.png"),
      url: `${BASE_URL}/orders/${order.id}`,
    }));
  } finally {
    if (order?.id) {
      await deleteOrder(adminPage, order.id);
    }
    if (worker?.id) {
      await deleteUser(adminPage, worker.id);
    }
    await adminContext.close();
    await workerContext.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
