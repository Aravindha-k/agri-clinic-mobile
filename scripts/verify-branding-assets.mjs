/**
 * Fails if launcher-only assets appear in runtime UI, or if in-app branding
 * does not use the canonical circular logo.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL = "logo_circle_transparent.png";

const RUNTIME_GLOBS = ["src", "mobile", "App.tsx", "AppProviders.tsx"];

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

const bannedRequire =
  /require\([^)]*(logo_icons|logo_icon|company_logo|logo_splash|kavya_logo|adaptive_icon_foreground|app_icon)|\.\.\/\.\.\/logo\.png|\/logo\.png"\)/;
const offenders = [];
for (const file of files) {
  const text = await fs.readFile(file, "utf8");
  if (bannedRequire.test(text)) {
    offenders.push(path.relative(root, file));
  }
}

assert.deepEqual(offenders, [], `banned logo requires in runtime UI: ${offenders.join(", ")}`);

const brandTs = await fs.readFile(path.join(root, "src/config/brand.ts"), "utf8");
assert.match(brandTs, new RegExp(CANONICAL));

const splash = await fs.readFile(path.join(root, "src/components/brand/splashAssets.ts"), "utf8");
assert.match(splash, new RegExp(CANONICAL));

const companyLogo = await fs.readFile(path.join(root, "src/components/brand/CompanyLogo.tsx"), "utf8");
assert.match(companyLogo, /LOGO_IMAGE/);
assert.match(companyLogo, /resizeMode="contain"/);
assert.doesNotMatch(companyLogo, /backgroundColor:\s*"#FFFFFF"/);

const login = await fs.readFile(path.join(root, "src/components/auth/LoginHeroHeader.tsx"), "utf8");
assert.match(login, /CompanyLogo/);

const brandLogo = await fs.readFile(path.join(root, "src/components/brand/BrandLogo.tsx"), "utf8");
assert.match(brandLogo, /CompanyLogo/);

const brandConfig = await fs.readFile(path.join(root, "src/config/brand.config.js"), "utf8");
assert.match(brandConfig, new RegExp(`logoAsset:\\s*"\\.\\/assets\\/brand\\/${CANONICAL}"`));
assert.match(brandConfig, new RegExp(`splashImageAsset:\\s*"\\.\\/assets\\/brand\\/${CANONICAL}"`));

console.log(`Branding verification passed (${files.length} runtime files; canonical ${CANONICAL}).`);
