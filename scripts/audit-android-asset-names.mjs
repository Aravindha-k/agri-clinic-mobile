/**
 * Fail CI if bundled asset filenames contain hyphens (Android AAPT2 drawable names).
 * Run: node scripts/audit-android-asset-names.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_DIRS = ["assets", "mobile/assets"];
const issues = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (entry.name.includes("-")) {
      issues.push(path.relative(ROOT, full).replace(/\\/g, "/"));
    }
  }
}

for (const dir of SCAN_DIRS) {
  walk(path.join(ROOT, dir));
}

console.log("=== Android asset filename audit ===\n");
if (issues.length === 0) {
  console.log("  ✓ No hyphenated asset filenames under assets/ or mobile/assets/");
  process.exit(0);
}

for (const file of issues) {
  console.log(`  ✗ ${file} (use underscores, not hyphens)`);
}
console.log(`\n${issues.length} issue(s). Run: node scripts/fix-android-asset-names.mjs`);
process.exit(1);
