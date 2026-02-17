const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 45000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealthy(url, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${url}/api/health`, { cache: "no-store" });
      if (res.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }
    await sleep(1000);
  }
  throw new Error(`Health endpoint did not become ready within ${timeout}ms`);
}

async function assertHealth() {
  const res = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Expected /api/health 200, got ${res.status}`);
  }

  const json = await res.json();
  if (!json?.ok) {
    throw new Error("Expected health response { ok: true }");
  }
}

async function assertRegister() {
  const id = Math.random().toString(36).slice(2, 10);
  const payload = {
    name: `Smoke ${id}`,
    email: `smoke-${id}@example.com`,
    password: "SmokePass123!",
    role: "UTLEIER",
  };

  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status !== 201) {
    const body = await res.text();
    throw new Error(`Expected /api/auth/register 201, got ${res.status}. Body: ${body}`);
  }
}

async function run() {
  await waitForHealthy(baseUrl, timeoutMs);
  await assertHealth();
  await assertRegister();
  console.log(`Smoke test passed for ${baseUrl}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
