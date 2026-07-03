/**
 * Renames asset files: hyphens → underscores (Android AAPT2 drawable names).
 * Updates source references. Run: node scripts/fix-android-asset-names.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_DIRS = ["assets", "mobile/assets"];
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".xml",
  ".gradle",
  ".properties"
]);

const renames = [];

function androidSafeName(name) {
  return name.replace(/-/g, "_");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.includes("-")) continue;
    const safe = androidSafeName(entry.name);
    if (safe === entry.name) continue;
    const target = path.join(dir, safe);
    if (fs.existsSync(target)) {
      console.error(`[fix-android-asset-names] target exists: ${target}`);
      process.exit(1);
    }
    renames.push({
      from: full,
      to: target,
      fromRel: path.relative(ROOT, full).replace(/\\/g, "/"),
      toRel: path.relative(ROOT, target).replace(/\\/g, "/")
    });
  }
}

for (const dir of SCAN_DIRS) {
  walk(path.join(ROOT, dir));
}

renames.sort((a, b) => b.fromRel.length - a.fromRel.length);

console.log(`Renaming ${renames.length} asset file(s)...`);
for (const { from, to, fromRel, toRel } of renames) {
  fs.renameSync(from, to);
  console.log(`  ${fromRel} → ${toRel}`);
}

function shouldScanFile(filePath) {
  if (filePath.includes("node_modules") || filePath.includes(".git")) return false;
  if (filePath.includes("android/app/build")) return false;
  if (filePath.includes(".tmp-export")) return false;
  const ext = path.extname(filePath);
  return TEXT_EXT.has(ext);
}

function walkSources(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "build") continue;
      walkSources(full, files);
    } else if (shouldScanFile(full)) {
      files.push(full);
    }
  }
  return files;
}

const sourceFiles = walkSources(ROOT);
let touched = 0;

for (const file of sourceFiles) {
  let text = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const { fromRel, toRel } of renames) {
    if (text.includes(fromRel)) {
      text = text.split(fromRel).join(toRel);
      changed = true;
    }
    const winFrom = fromRel.replace(/\//g, "\\");
    const winTo = toRel.replace(/\//g, "\\");
    if (winFrom !== fromRel && text.includes(winFrom)) {
      text = text.split(winFrom).join(winTo);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, text);
    touched += 1;
    console.log(`Updated ${path.relative(ROOT, file)}`);
  }
}

console.log(`\nDone. ${renames.length} rename(s), ${touched} file(s) updated.`);
