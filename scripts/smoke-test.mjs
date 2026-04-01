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

async function assertDatabaseHealth() {
  const res = await fetch(`${baseUrl}/api/health/db`, { cache: "no-store" });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`Expected /api/health/db 200, got ${res.status}. Body: ${JSON.stringify(json)}`);
  }

  if (!json?.ok) {
    throw new Error("Expected database health response { ok: true }");
  }
}

async function assertRegister() {
  const id = Math.random().toString(36).slice(2, 10);
  const payload = {
    name: `Smoke ${id}`,
    email: `smoke-${id}@example.com`,
    phone: "+4799999999",
    password: "SmokePass123!",
    role: "UTLEIER",
    acceptedTerms: true,
  };

  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 202) {
    return;
  }

  const body = await res.text();

  if (res.status === 503) {
    const json = (() => {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    })();
    if (json?.code === "MAIL_NOT_CONFIGURED") {
      console.log("Smoke test skipped email registration check because mail is not configured");
      return;
    }
  }

  throw new Error(`Expected /api/auth/register 202, got ${res.status}. Body: ${body}`);
}

async function run() {
  await waitForHealthy(baseUrl, timeoutMs);
  await assertHealth();
  await assertDatabaseHealth();
  await assertRegister();
  console.log(`Smoke test passed for ${baseUrl}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
