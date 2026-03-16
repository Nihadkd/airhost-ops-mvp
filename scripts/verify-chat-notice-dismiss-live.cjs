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

async function createWorker(page, suffix) {
  return page.evaluate(async ({ suffix }) => {
    const email = `chat-worker-${suffix}@airhost.no`;
    const password = "Worker123!";
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Chat Worker ${suffix}`,
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

async function createOrder(page, suffix) {
  return page.evaluate(async ({ suffix, landlordId }) => {
    const startAt = new Date();
    startAt.setUTCDate(startAt.getUTCDate() + 1);
    startAt.setUTCMinutes(startAt.getUTCMinutes() < 30 ? 30 : 0, 0, 0);
    if (startAt.getUTCMinutes() === 0) startAt.setUTCHours(startAt.getUTCHours() + 1);
    const deadlineAt = new Date(startAt);
    deadlineAt.setUTCHours(deadlineAt.getUTCHours() + 2);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landlordId,
        type: "CLEANING",
        address: `Chat notice test ${suffix}, Oslo`,
        date: startAt.toISOString(),
        deadlineAt: deadlineAt.toISOString(),
        guestCount: 1,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`order create failed ${res.status} ${JSON.stringify(data)}`);
    return data;
  }, { suffix, landlordId: LANDLORD_ID });
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

async function approveAssignment(page, orderId) {
  await page.evaluate(async ({ orderId }) => {
    const res = await fetch(`/api/orders/${orderId}/assignment/approve`, { method: "PUT" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`approve failed ${res.status} ${JSON.stringify(data)}`);
  }, { orderId });
}

async function sendMessage(page, orderId, text) {
  await page.evaluate(async ({ orderId, text }) => {
    const res = await fetch(`/api/orders/${orderId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`message failed ${res.status} ${JSON.stringify(data)}`);
  }, { orderId, text });
}

async function startOrder(page, orderId) {
  await page.evaluate(async ({ orderId }) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`start failed ${res.status} ${JSON.stringify(data)}`);
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
  let worker = null;
  let order = null;

  try {
    const suffix = String(Date.now());
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    worker = await createWorker(adminPage, suffix);
    order = await createOrder(adminPage, suffix);
    await assignWorker(adminPage, order.id, worker.id);

    await login(workerPage, worker.email, worker.password);
    await acceptAssignment(workerPage, order.id);
    await approveAssignment(adminPage, order.id);
    await startOrder(workerPage, order.id);

    await adminPage.goto(`${BASE_URL}/orders/${order.id}`, { waitUntil: "domcontentloaded" });
    await workerPage.goto(`${BASE_URL}/orders/${order.id}`, { waitUntil: "domcontentloaded" });
    await adminPage.getByText(/privat chat|private chat/i).waitFor({ state: "visible", timeout: 15000 });
    await workerPage.getByText(/privat chat|private chat/i).waitFor({ state: "visible", timeout: 15000 });

    await sendMessage(workerPage, order.id, `auto-dismiss ${suffix}`);
    const notice = adminPage.locator('[data-testid="new-message-notice"]').first();
    await notice.waitFor({ state: "visible", timeout: 15000 });
    await adminPage.waitForTimeout(6000);
    const autoDismissed = !(await notice.isVisible().catch(() => false));

    await sendMessage(workerPage, order.id, `swipe-dismiss ${suffix}`);
    await notice.waitFor({ state: "visible", timeout: 15000 });
    const box = await notice.boundingBox();
    if (!box) throw new Error("notice box not found");
    await adminPage.evaluate(({ startX, startY, endX }) => {
      const el = document.querySelector('[data-testid="new-message-notice"]');
      if (!el) return;
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: startX, clientY: startY, buttons: 1 }));
      window.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: endX, clientY: startY, buttons: 1 }));
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: endX, clientY: startY, buttons: 0 }));
    }, { startX: box.x + box.width / 2, startY: box.y + box.height / 2, endX: box.x + box.width / 2 + 180 });
    await adminPage.waitForTimeout(800);
    const swipeNoticeState = await adminPage.evaluate(() => {
      const el = document.querySelector('[data-testid="new-message-notice"]');
      if (!el) return { exists: false, transform: "", opacity: "", text: "" };
      const style = window.getComputedStyle(el);
      return {
        exists: true,
        transform: style.transform,
        opacity: style.opacity,
        text: el.textContent ?? "",
      };
    });
    const swipeDismissed = !swipeNoticeState.exists;

    await adminPage.screenshot({
      path: path.join(outputDir, "chat-notice-dismiss-live.png"),
      fullPage: true,
    });

    console.log(JSON.stringify({
      orderNumber: order.orderNumber,
      autoDismissed,
      swipeDismissed,
      swipeNoticeState,
      screenshot: path.join("output", "playwright", "chat-notice-dismiss-live.png"),
      url: `${BASE_URL}/orders/${order.id}`,
    }));
  } finally {
    if (order?.id) await deleteOrder(adminPage, order.id);
    if (worker?.id) await deleteUser(adminPage, worker.id);
    await adminContext.close();
    await workerContext.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
