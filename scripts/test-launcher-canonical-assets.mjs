/**
 * Launcher icon must use the same canonical circular logo as Today / Login.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const CANONICAL = "assets/brand/logo_circle_transparent.png";
const APP_ICON = "assets/brand/app_icon.png";
const ADAPTIVE_FG = "assets/brand/adaptive_icon_foreground.png";

assert.ok(fs.existsSync(path.join(root, CANONICAL)), "canonical logo missing");
assert.ok(fs.existsSync(path.join(root, APP_ICON)), "app_icon missing");
assert.ok(fs.existsSync(path.join(root, ADAPTIVE_FG)), "adaptive foreground missing");

const brandTs = read("src/config/brand.ts");
assert.match(brandTs, /logo_circle_transparent\.png/);
assert.doesNotMatch(brandTs, /app_icon\.png|adaptive_icon_foreground/);

const brandConfig = read("src/config/brand.config.js");
assert.match(brandConfig, /logoAsset:\s*"\.\/assets\/brand\/logo_circle_transparent\.png"/);
assert.match(brandConfig, /iconAsset:\s*"\.\/assets\/brand\/app_icon\.png"/);
assert.match(brandConfig, /adaptiveIconAsset:\s*"\.\/assets\/brand\/adaptive_icon_foreground\.png"/);
assert.match(brandConfig, /iconBackgroundColor:\s*"#0F6B43"/);

const appConfig = read("app.config.js");
assert.match(appConfig, /foregroundImage:\s*brand\.adaptiveIconAsset/);
assert.match(appConfig, /backgroundColor:\s*brand\.iconBackgroundColor/);
assert.match(appConfig, /icon:\s*brand\.iconAsset/);

const companyLogo = read("src/components/brand/CompanyLogo.tsx");
assert.match(companyLogo, /LOGO_IMAGE/);

const homeHero = read("mobile/components/today/HomeLogoHero.tsx");
assert.match(homeHero, /LOGO_IMAGE/);

const promote = read("scripts/promote-logo-icons.mjs");
assert.match(promote, /logo_circle_transparent\.png/);
assert.match(promote, /ADAPTIVE_CONTENT_RATIO = 0\.68/);
assert.match(promote, /Never write back to the canonical/);
assert.doesNotMatch(promote, /writeFile\(OUT\.circleTransparent/);

const colors = read("android/app/src/main/res/values/colors.xml");
assert.match(colors, /iconBackground[^>]*>#0F6B43</i);

for (const xml of [
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml"
]) {
  const text = read(xml);
  assert.match(text, /@color\/iconBackground/);
  assert.match(text, /@mipmap\/ic_launcher_foreground/);
  assert.doesNotMatch(text, /white|#FFFFFF/i);
}

// Obsolete launcher paths must not be wired in live config
for (const forbidden of ["logo_splash.png", "logo_icons", "company_logo", "kavya_logo"]) {
  assert.doesNotMatch(brandConfig, new RegExp(forbidden));
  assert.doesNotMatch(appConfig, new RegExp(forbidden));
}

console.log("Launcher icon canonical asset checks passed.");
process.exit(0);
