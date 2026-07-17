/**
 * Fails if logo_icons appears outside launcher config, or if in-app branding
 * does not use project-root logo.png.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const RUNTIME_GLOBS = [
  "src",
  "mobile",
  "App.tsx",
  "AppProviders.tsx"
];

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "build" || e.name === ".git") continue;
      await walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = [];
for (const rel of RUNTIME_GLOBS) {
  const full = path.join(root, rel);
  const st = await fs.stat(full).catch(() => null);
  if (!st) continue;
  if (st.isDirectory()) await walk(full, files);
  else files.push(full);
}

const banned = /logo_icons\.png|logo_icon\.png|adaptive_icon_foreground\.png|app_icon\.png/;
const offenders = [];
for (const file of files) {
  const text = await fs.readFile(file, "utf8");
  if (banned.test(text)) {
    // Allow comments that say "never use launcher" only if they don't require() those files
    if (/require\([^)]*(logo_icons|logo_icon|adaptive_icon_foreground|app_icon)/.test(text)) {
      offenders.push(path.relative(root, file));
    }
  }
}

assert.deepEqual(offenders, [], `launcher assets must not be required in runtime UI: ${offenders.join(", ")}`);

const brandTs = await fs.readFile(path.join(root, "src/config/brand.ts"), "utf8");
assert.match(brandTs, /require\("\.\.\/\.\.\/logo\.png"\)/);

const splash = await fs.readFile(path.join(root, "src/components/brand/splashAssets.ts"), "utf8");
assert.match(splash, /require\("\.\.\/\.\.\/\.\.\/logo\.png"\)/);

const login = await fs.readFile(path.join(root, "src/components/auth/LoginHeroHeader.tsx"), "utf8");
assert.match(login, /CompanyLogoMark/);
assert.doesNotMatch(login, /backgroundColor:\s*Colors\.surface/);
assert.doesNotMatch(login, /backgroundColor:\s*"#FFFFFF"/);

const brandLogo = await fs.readFile(path.join(root, "src/components/brand/BrandLogo.tsx"), "utf8");
assert.match(brandLogo, /CompanyLogoMark/);
assert.doesNotMatch(brandLogo, /plate:\s*true/);
assert.doesNotMatch(brandLogo, /backgroundColor:\s*"#FFFFFF"/);

const companyMark = await fs.readFile(path.join(root, "src/components/brand/CompanyLogoMark.tsx"), "utf8");
assert.match(companyMark, /LOGO_IMAGE/);
assert.match(companyMark, /backgroundColor:\s*"transparent"/);

const brandConfig = await fs.readFile(path.join(root, "src/config/brand.config.js"), "utf8");
assert.match(brandConfig, /logoAsset:\s*"\.\/logo\.png"/);
assert.match(brandConfig, /splashImageAsset:\s*"\.\/logo\.png"/);
assert.match(brandConfig, /kacIconApproved:\s*"\.\/assets\/brand\/logo_icons\.png"/);
assert.match(brandConfig, /iconAsset:\s*"\.\/assets\/brand\/app_icon\.png"/);
assert.match(brandConfig, /adaptiveIconAsset:\s*"\.\/assets\/brand\/adaptive_icon_foreground\.png"/);

const absWin = /D:\\\\agri-clinic|D:\/agri-clinic/;
for (const file of files) {
  const text = await fs.readFile(file, "utf8");
  assert.ok(!absWin.test(text), `absolute Windows path in ${path.relative(root, file)}`);
}

console.log(`Branding verification passed (${files.length} runtime files checked).`);
