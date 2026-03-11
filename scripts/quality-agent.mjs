import { spawn } from "node:child_process";
import process from "node:process";

const isWin = process.platform === "win32";
const npmBin = isWin ? "npm.cmd" : "npm";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const visualOnly = args.has("--visual-only");
const noVisual = args.has("--no-visual");
const autoFix = args.has("--auto-fix");

const baseUrl = process.env.VERIFY_BASE_URL?.trim() || "";
const visualRetries = Number(process.env.VISUAL_MAX_ATTEMPTS || "3");
const retryDelayMs = Number(process.env.VISUAL_RETRY_DELAY_MS || "2500");
const port = Number(process.env.PORT || "3000");
const devReadyTimeoutMs = Number(process.env.DEV_READY_TIMEOUT_MS || "120000");

const codeChecks = [
  `${npmBin} run control:check`,
  `${npmBin} run lint`,
  `${npmBin} run typecheck`,
  `${npmBin} run test`
];

const visualChecks = [
  "node ./scripts/verify-guestcount-visual.mjs",
  "node ./scripts/verify-order-map-width.mjs"
];

const fixCommands = autoFix ? [`${npmBin} run control:fix`] : [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message) {
  console.log(`[quality-agent] ${message}`);
}

function runShell(command, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    if (dryRun) {
      log(`DRY RUN: ${command}`);
      resolve();
      return;
    }

    const child = spawn(command, {
      shell: true,
      stdio: "inherit",
      env: { ...process.env, ...extraEnv }
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed (${code}): ${command}`));
      }
    });
  });
}

async function waitForServer(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status >= 200 && res.status < 500) {
        return;
      }
    } catch {
      // Retry until timeout.
    }
    await sleep(1200);
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms (${url})`);
}

function startDevServer() {
  if (dryRun) {
    log(`DRY RUN: ${npmBin} run dev`);
    return { stop: async () => {} };
  }

  const child = spawn(`${npmBin} run dev`, {
    shell: true,
    stdio: "inherit",
    env: process.env
  });

  const stop = async () => {
    if (child.exitCode !== null) return;
    if (isWin) {
      await runShell(`taskkill /PID ${child.pid} /T /F`).catch(() => {});
    } else {
      child.kill("SIGTERM");
    }
  };

  return { stop };
}

async function runChecksSequentially(commands, env = {}) {
  for (const command of commands) {
    log(`Running: ${command}`);
    await runShell(command, env);
  }
}

async function runVisualWithRetries(env = {}) {
  const infinite = visualRetries <= 0;
  for (let attempt = 1; infinite || attempt <= visualRetries; attempt += 1) {
    log(`Visual attempt ${attempt}${infinite ? "" : `/${visualRetries}`}`);
    try {
      await runChecksSequentially(visualChecks, { ...env, VISUAL_ATTEMPT: String(attempt) });
      log("Visual checks passed");
      return;
    } catch (error) {
      log(`Visual checks failed on attempt ${attempt}: ${error.message}`);
      if (!infinite && attempt === visualRetries) {
        throw error;
      }

      if (fixCommands.length > 0) {
        log("Running auto-fix commands before retry");
        await runChecksSequentially(fixCommands, env);
      }

      log(`Waiting ${retryDelayMs}ms before retry`);
      await sleep(retryDelayMs);
    }
  }
}

async function main() {
  const shouldRunCode = !visualOnly;
  const shouldRunVisual = !noVisual;

  log(
    `Starting (code=${shouldRunCode ? "on" : "off"}, visual=${
      shouldRunVisual ? "on" : "off"
    }, autoFix=${autoFix ? "on" : "off"})`
  );

  if (shouldRunCode) {
    await runChecksSequentially(codeChecks);
    log("Code checks passed");
  }

  if (!shouldRunVisual) {
    log("Done (visual checks skipped)");
    return;
  }

  const targetBaseUrl = baseUrl || `http://127.0.0.1:${port}`;
  let devServer = null;

  try {
    if (!baseUrl) {
      log(`No VERIFY_BASE_URL set. Starting local dev server on ${targetBaseUrl}`);
      devServer = startDevServer();
      if (!dryRun) {
        await waitForServer(targetBaseUrl, devReadyTimeoutMs);
      }
      log("Dev server is ready");
    } else {
      log(`Using external base URL: ${targetBaseUrl}`);
    }

    await runVisualWithRetries({ VERIFY_BASE_URL: targetBaseUrl });
    log("All quality checks passed");
  } finally {
    if (devServer) {
      await devServer.stop();
      log("Dev server stopped");
    }
  }
}

main().catch((error) => {
  log(`FAILED: ${error.message}`);
  process.exit(1);
});
