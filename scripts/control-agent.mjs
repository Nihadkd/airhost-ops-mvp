import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const RULES_PATH = path.join(ROOT, "scripts", "control-agent-rules.json");
const SCAN_DIRS = ["app", "components", "lib", "tests", "mobile", "scripts", "prisma"];
const SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".txt",
  ".html"
]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "coverage", ".vercel"]);

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function walkFiles(dirPath, out) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(absolute, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SCAN_EXTENSIONS.has(path.extname(entry.name))) continue;
    out.push(absolute);
  }
}

async function loadRules() {
  const raw = await fs.readFile(RULES_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return {
    forbidden: Array.isArray(parsed.forbidden) ? parsed.forbidden : [],
    requiredLiterals: Array.isArray(parsed.requiredLiterals) ? parsed.requiredLiterals : []
  };
}

async function collectFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const absolute = path.join(ROOT, dir);
    try {
      const stats = await fs.stat(absolute);
      if (stats.isDirectory()) {
        await walkFiles(absolute, files);
      }
    } catch {
      // Ignore missing optional directories.
    }
  }
  return files.filter((filePath) => path.resolve(filePath) !== path.resolve(RULES_PATH));
}

async function run() {
  const fixMode = process.argv.includes("--fix");
  const rules = await loadRules();
  const files = await collectFiles();
  const issues = [];
  let fixedCount = 0;

  for (const filePath of files) {
    const original = await fs.readFile(filePath, "utf8");
    let next = original;

    for (const rule of rules.forbidden) {
      if (!rule?.find || typeof rule.find !== "string") continue;
      if (typeof rule.replace === "string" && rule.find === rule.replace) continue;
      const finder = new RegExp(escapeRegExp(rule.find), "g");
      const matches = next.match(finder);
      if (!matches) continue;
      const matchCount = matches.length;
      issues.push({
        filePath,
        type: "forbidden",
        find: rule.find,
        replace: typeof rule.replace === "string" ? rule.replace : "",
        reason: rule.reason || "",
        count: matchCount
      });
      if (fixMode && typeof rule.replace === "string") {
        next = next.replace(finder, rule.replace);
        fixedCount += matchCount;
      }
    }

    if (fixMode && next !== original) {
      await fs.writeFile(filePath, next, "utf8");
    }
  }

  const allContent = await Promise.all(files.map((filePath) => fs.readFile(filePath, "utf8")));
  const joined = allContent.join("\n");
  const requiredMissing = [];

  for (const req of rules.requiredLiterals) {
    if (!req?.value || typeof req.value !== "string") continue;
    if (!joined.includes(req.value)) {
      requiredMissing.push(req);
    }
  }

  if (issues.length > 0) {
    console.log("control-agent: forbidden strings found:");
    for (const item of issues) {
      const detail = item.reason ? ` (${item.reason})` : "";
      console.log(
        `- ${rel(item.filePath)}: "${item.find}" x${item.count}${detail}` +
          (fixMode && item.replace ? ` -> "${item.replace}"` : "")
      );
    }
  }

  if (fixMode && fixedCount > 0) {
    console.log(`control-agent: applied ${fixedCount} automatic replacement(s).`);
  }

  if (requiredMissing.length > 0) {
    console.log("control-agent: required literals missing:");
    for (const item of requiredMissing) {
      const detail = item.reason ? ` (${item.reason})` : "";
      console.log(`- "${item.value}"${detail}`);
    }
  }

  if (issues.length === 0 && requiredMissing.length === 0) {
    console.log("control-agent: OK");
    return;
  }

  // In fix mode we still fail if required literals are missing.
  // In check mode we fail on both forbidden matches and missing required literals.
  if (requiredMissing.length > 0 || (!fixMode && issues.length > 0)) {
    process.exitCode = 1;
    return;
  }

  // In fix mode with only forbidden matches, report success after replacements.
  console.log("control-agent: fixed forbidden strings.");
}

run().catch((error) => {
  console.error("control-agent: failed to run", error);
  process.exit(1);
});
