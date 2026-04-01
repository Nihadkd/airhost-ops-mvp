require("dotenv/config");

const { spawnSync } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");

const directUrl = process.env.DATABASE_URL_UNPOOLED;
const primaryUrl = process.env.DATABASE_URL;
const prismaCliPath = require.resolve("prisma/build/index.js");
const maxAttempts = 7;
const retryDelayMs = 3000;

if (!directUrl && !primaryUrl) {
  console.error("DATABASE_URL or DATABASE_URL_UNPOOLED must be set before running db-local-reset.");
  process.exit(1);
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync(
      process.execPath,
      [prismaCliPath, "db", "push", "--force-reset", "--skip-generate"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: directUrl || primaryUrl,
        },
      },
    );

    if (result.status === 0) {
      process.exit(0);
    }

    if (result.error) {
      console.error(result.error);
    }

    if (attempt < maxAttempts) {
      console.warn(
        `[db-local-reset] Reset attempt ${attempt}/${maxAttempts} failed. Waiting ${Math.round(retryDelayMs / 1000)}s before retry.`,
      );
      await delay(retryDelayMs);
    }
  }

  process.exit(1);
}

void main();
