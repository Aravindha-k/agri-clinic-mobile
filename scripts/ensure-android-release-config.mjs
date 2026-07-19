/**
 * After `expo prebuild`, apply client-test release settings:
 * - HTTP cleartext network security for AWS host
 * - Debug keystore signing on release (CI client APK)
 * - Notification sounds in res/raw
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AWS_HOST = "13.207.17.117";
const androidDir = resolve(ROOT, "android");

if (!existsSync(androidDir)) {
  console.error("[ensure-android-release-config] android/ missing — run expo prebuild first");
  process.exit(1);
}

const nscDir = resolve(androidDir, "app/src/main/res/xml");
const nscPath = resolve(nscDir, "network_security_config.xml");
mkdirSync(nscDir, { recursive: true });
writeFileSync(
  nscPath,
  `<?xml version="1.0" encoding="utf-8"?>
<!-- Cleartext only for known HTTP API hosts — not a global allow-all. -->
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">192.168.29.18</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">127.0.0.1</domain>
    <domain includeSubdomains="false">${AWS_HOST}</domain>
  </domain-config>
  <base-config cleartextTrafficPermitted="false" />
</network-security-config>
`
);
console.log("[ensure-android-release-config] wrote network_security_config.xml (scoped cleartext)");

const manifestPath = resolve(androidDir, "app/src/main/AndroidManifest.xml");
let manifest = readFileSync(manifestPath, "utf8");
if (!manifest.includes('android:usesCleartextTraffic="true"')) {
  manifest = manifest.replace(
    "<application ",
    '<application android:usesCleartextTraffic="true" '
  );
}
if (!manifest.includes("networkSecurityConfig")) {
  manifest = manifest.replace(
    /<application\b/,
    '<application android:networkSecurityConfig="@xml/network_security_config"'
  );
}
const requiredPerms = [
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.CAMERA",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.POST_NOTIFICATIONS"
];
for (const perm of requiredPerms) {
  if (!manifest.includes(perm)) {
    const line = `  <uses-permission android:name="${perm}"/>\n`;
    manifest = manifest.replace(/(<manifest[^>]*>\n)/, `$1${line}`);
  }
}

const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim() || "";
const mapsMetaName = "com.google.android.geo.API_KEY";
const mapsMetaTag = `<meta-data android:name="${mapsMetaName}" android:value="${mapsKey}"/>`;

if (!mapsKey) {
  console.error(
    "[ensure-android-release-config] GOOGLE_MAPS_ANDROID_API_KEY is missing — cannot inject Google Maps metadata"
  );
  process.exit(1);
}

if (!manifest.includes(mapsMetaName)) {
  manifest = manifest.replace(/(<application[^>]*>)/, `$1\n    ${mapsMetaTag}`);
  console.log("[ensure-android-release-config] injected Google Maps API key metadata");
} else {
  manifest = manifest.replace(
    new RegExp(
      `<meta-data\\s+android:name="${mapsMetaName}"\\s+android:value="[^"]*"\\s*/>`,
      "g"
    ),
    mapsMetaTag
  );
  console.log("[ensure-android-release-config] ensured Google Maps API key metadata");
}

writeFileSync(manifestPath, manifest);
console.log("[ensure-android-release-config] patched AndroidManifest.xml");

const buildGradlePath = resolve(androidDir, "app/build.gradle");
let gradle = readFileSync(buildGradlePath, "utf8");
if (!gradle.includes("signingConfigs")) {
  gradle = gradle.replace(
    /android\s*\{/,
    `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`
  );
}
if (!/release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/.test(gradle)) {
  gradle = gradle.replace(/release\s*\{/, "release {\n            signingConfig signingConfigs.debug");
}
writeFileSync(buildGradlePath, gradle);
console.log("[ensure-android-release-config] patched release signing (debug keystore for client test)");

const gradlePropsPath = resolve(androidDir, "gradle.properties");
if (existsSync(gradlePropsPath)) {
  let props = readFileSync(gradlePropsPath, "utf8");
  if (!/android\.enableMinifyInReleaseBuilds=false/m.test(props)) {
    props += "\nandroid.enableMinifyInReleaseBuilds=false\n";
  }
  if (!/android\.enableShrinkResourcesInReleaseBuilds=false/m.test(props)) {
    props += "android.enableShrinkResourcesInReleaseBuilds=false\n";
  }
  props = props.replace(
    /reactNativeArchitectures=.*/m,
    "reactNativeArchitectures=armeabi-v7a,arm64-v8a"
  );
  writeFileSync(gradlePropsPath, props);
  console.log("[ensure-android-release-config] release minify off, arm ABIs only");
}

if (!/abiFilters/.test(gradle)) {
  gradle = readFileSync(buildGradlePath, "utf8");
  gradle = gradle.replace(
    /defaultConfig\s*\{/,
    `defaultConfig {
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a"
        }`
  );
  if (/minSdkVersion rootProject\.ext\.minSdkVersion/.test(gradle)) {
    gradle = gradle.replace(
      "minSdkVersion rootProject.ext.minSdkVersion",
      "minSdkVersion Math.max(rootProject.ext.minSdkVersion, 26)"
    );
  }
  writeFileSync(buildGradlePath, gradle);
  console.log("[ensure-android-release-config] minSdk 26+, ABI filters applied");
}

const rawDir = resolve(androidDir, "app/src/main/res/raw");
mkdirSync(rawDir, { recursive: true });
for (const name of ["hydration_chime.wav"]) {
  const source = resolve(ROOT, "assets/sounds", name);
  if (existsSync(source)) {
    copyFileSync(source, resolve(rawDir, name));
  } else {
    console.warn(`[ensure-android-release-config] missing ${source}`);
  }
}
console.log("[ensure-android-release-config] synced notification sounds");

const NATIVE_LAUNCH_BG = "#0B3D2E";
const resDir = resolve(androidDir, "app/src/main/res");
const colorsPath = resolve(resDir, "values/colors.xml");
if (existsSync(colorsPath)) {
  let colors = readFileSync(colorsPath, "utf8");
  colors = colors.replace(
    /<color name="splashscreen_background">[^<]*<\/color>/,
    `<color name="splashscreen_background">${NATIVE_LAUNCH_BG}</color>`
  );
  if (!colors.includes("splashscreen_background")) {
    colors = colors.replace(
      "<resources>",
      `<resources>\n  <color name="splashscreen_background">${NATIVE_LAUNCH_BG}</color>`
    );
  }
  writeFileSync(colorsPath, colors);
  console.log("[ensure-android-release-config] patched splashscreen_background color");
}

const stylesPath = resolve(resDir, "values/styles.xml");
if (existsSync(stylesPath)) {
  const styles = `<resources xmlns:tools="http://schemas.android.com/tools">
  <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="android:enforceNavigationBarContrast" tools:targetApi="29">false</item>
    <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    <item name="colorPrimary">@color/colorPrimary</item>
    <item name="android:statusBarColor">@color/splashscreen_background</item>
    <item name="android:navigationBarColor">@color/splashscreen_background</item>
    <item name="android:windowBackground">@color/splashscreen_background</item>
  </style>
  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_icon</item>
    <item name="windowSplashScreenIconBackgroundColor">@color/splashscreen_background</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
  </style>
</resources>
`;
  writeFileSync(stylesPath, styles);
  console.log("[ensure-android-release-config] patched native launch Theme.App.SplashScreen");
}

const stylesV31Dir = resolve(resDir, "values-v31");
mkdirSync(stylesV31Dir, { recursive: true });
writeFileSync(
  resolve(stylesV31Dir, "styles.xml"),
  `<resources>
  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_icon</item>
    <item name="windowSplashScreenIconBackgroundColor">@color/splashscreen_background</item>
    <item name="android:windowSplashScreenAnimationDuration">0</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
  </style>
</resources>
`
);
console.log("[ensure-android-release-config] wrote values-v31 splash overrides");

const splashScript = resolve(ROOT, "scripts/generate-splash-logo.mjs");
if (existsSync(splashScript)) {
  execSync(`node "${splashScript}"`, { stdio: "inherit", cwd: ROOT });
  console.log("[ensure-android-release-config] generated circular native splash drawables");
}

const launcherBgPath = resolve(androidDir, "app/src/main/res/drawable/ic_launcher_background.xml");
if (existsSync(launcherBgPath)) {
  writeFileSync(
    launcherBgPath,
    `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/iconBackground"/>
</layer-list>
`
  );
  console.log("[ensure-android-release-config] fixed ic_launcher_background (icon color only)");
}
