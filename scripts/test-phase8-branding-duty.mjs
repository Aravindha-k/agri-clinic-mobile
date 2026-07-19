/**
 * Phase 8 branding: canonical circular logo, no white plates in active brand surfaces.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

test("CompanyLogo is circular transparent canonical mark", () => {
  const mark = read("src/components/brand/CompanyLogo.tsx");
  assert.match(mark, /LOGO_IMAGE/);
  assert.match(mark, /resizeMode="contain"/);
  assert.doesNotMatch(mark, /backgroundColor:\s*"#FFFFFF"/);
  assert.doesNotMatch(mark, /logo_icons|app_icon|adaptive_icon/);
});

test("BrandLogo uses CompanyLogo without white square plates", () => {
  const brandLogo = read("src/components/brand/BrandLogo.tsx");
  assert.match(brandLogo, /CompanyLogo/);
  assert.doesNotMatch(brandLogo, /backgroundColor:\s*"#FFFFFF"/);
});

test("brand surfaces use CompanyLogo or LOGO_IMAGE from canonical asset", () => {
  for (const rel of [
    "mobile/components/brand/BrandLogoBadge.tsx",
    "mobile/components/today/HomeLogoHero.tsx",
    "mobile/components/brand/BrandInlineLogo.tsx",
    "src/components/auth/LoginHeroHeader.tsx"
  ]) {
    const text = read(rel);
    assert.match(text, /CompanyLogo/);
    assert.doesNotMatch(text, /backgroundColor:\s*"#FFFFFF"/, rel);
  }
});

test("brand.ts requires only logo_circle_transparent.png", () => {
  const brandTs = read("src/config/brand.ts");
  assert.match(brandTs, /logo_circle_transparent\.png/);
  assert.doesNotMatch(brandTs, /require\([^)]*logo\.png|company_logo|logo_splash|logo_icons/);
});
