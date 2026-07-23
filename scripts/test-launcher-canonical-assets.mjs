/**
 * Launcher + splash must use canonical logo; no obsolete bright green plate.
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
assert.match(brandConfig, /iconBackgroundColor:\s*"#004D17"/);
assert.match(brandConfig, /nativeSplashBackgroundColor:\s*"#D8ECF8"/);
assert.doesNotMatch(brandConfig, /iconBackgroundColor:\s*"#0F6B43"/);
assert.doesNotMatch(brandConfig, /nativeSplashBackgroundColor:\s*"#0B3D2E"/);

const appConfig = read("app.config.js");
assert.match(appConfig, /foregroundImage:\s*brand\.adaptiveIconAsset/);
assert.match(appConfig, /backgroundColor:\s*brand\.iconBackgroundColor/);
assert.match(appConfig, /icon:\s*brand\.iconAsset/);
assert.match(appConfig, /versionCode:\s*9/);

const companyLogo = read("src/components/brand/CompanyLogo.tsx");
assert.match(companyLogo, /LOGO_IMAGE/);
assert.match(companyLogo, /backgroundColor: "transparent"/);
assert.doesNotMatch(companyLogo, /require\([^)]*app_icon|require\([^)]*adaptive_icon_foreground/);

const login = read("src/components/auth/LoginHeroHeader.tsx");
assert.match(login, /CompanyLogo/);
assert.doesNotMatch(login, /app_icon|adaptive_icon_foreground|LOGO_IMAGE/);

const homeHero = read("mobile/components/today/HomeLogoHero.tsx");
assert.match(homeHero, /LOGO_IMAGE/);
assert.doesNotMatch(homeHero, /app_icon|adaptive_icon_foreground/);

const promote = read("scripts/promote-logo-icons.mjs");
assert.match(promote, /logo_circle_transparent\.png/);
assert.match(promote, /ADAPTIVE_CONTENT_RATIO = 0\.66/);
assert.match(promote, /LAUNCHER_BG = "#004D17"/);
assert.match(promote, /Never write back to the canonical/);
assert.doesNotMatch(promote, /function buildGreenPlate|background: \{\s*r: 15, g: 107, b: 67/);
assert.doesNotMatch(promote, /LAUNCHER_BG = "#0F6B43"|iconBackgroundColor:\s*"#0F6B43"/);

const splashColors = read("src/components/brand/splashColors.ts");
assert.match(splashColors, /NATIVE_LAUNCH_BG = "#D8ECF8"/);
assert.doesNotMatch(splashColors, /NATIVE_LAUNCH_BG = "#0B3D2E"/);

const ensureAndroid = read("scripts/ensure-android-release-config.mjs");
assert.match(ensureAndroid, /nativeSplashBackgroundColor/);
assert.doesNotMatch(ensureAndroid, /NATIVE_LAUNCH_BG\s*=\s*"#0B3D2E"/);
assert.doesNotMatch(ensureAndroid, /splashscreen_background[^#]*#0B3D2E/);

const colors = read("android/app/src/main/res/values/colors.xml");
assert.match(colors, /iconBackground[^>]*>#004D17</i);
assert.match(colors, /splashscreen_background[^>]*>#D8ECF8</i);
assert.doesNotMatch(colors, /iconBackground[^>]*>#0F6B43</i);
assert.doesNotMatch(colors, /splashscreen_background[^>]*>#0B3D2E</i);

const styles = read("android/app/src/main/res/values/styles.xml");
assert.match(styles, /windowSplashScreenAnimatedIcon">@drawable\/splashscreen_icon/);
assert.match(styles, /windowSplashScreenBackground">@color\/splashscreen_background/);

for (const xml of [
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml"
]) {
  const text = read(xml);
  assert.match(text, /@color\/iconBackground/);
  assert.match(text, /@mipmap\/ic_launcher_foreground/);
}

for (const forbidden of ["logo_splash.png", "logo_icons", "company_logo", "kavya_logo"]) {
  assert.doesNotMatch(brandConfig, new RegExp(forbidden));
  assert.doesNotMatch(appConfig, new RegExp(forbidden));
}

console.log("Launcher icon canonical asset checks passed.");
process.exit(0);
