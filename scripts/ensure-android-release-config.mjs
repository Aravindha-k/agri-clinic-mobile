/**
 * After `expo prebuild`, apply client-test release settings:
 * - HTTP cleartext network security for AWS host
 * - Debug keystore signing on release (CI client APK)
 * - Notification sounds in res/raw
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">${AWS_HOST}</domain>
  </domain-config>
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`
);
console.log("[ensure-android-release-config] wrote network_security_config.xml");

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

const APP_BG = "#FAF9F6";
const stylesPath = resolve(androidDir, "app/src/main/res/values/styles.xml");
if (existsSync(stylesPath)) {
  let styles = readFileSync(stylesPath, "utf8");
  const navItems = [
    `<item name="android:navigationBarColor">${APP_BG}</item>`,
    `<item name="android:windowBackground">${APP_BG}</item>`,
    `<item name="android:enforceNavigationBarContrast" tools:targetApi="29">false</item>`
  ];
  for (const item of navItems) {
    const key = item.match(/name="([^"]+)"/)?.[1];
    if (key && styles.includes(key)) continue;
    styles = styles.replace(/<\/style>\s*\n\s*<style name="Theme\.App\.SplashScreen"/, `${item}\n  </style>\n  <style name="Theme.App.SplashScreen"`);
    if (!styles.includes(key)) {
      styles = styles.replace(
        /<style name="AppTheme" parent="[^"]+">/,
        (match) => `${match}\n    ${item}`
      );
    }
  }
  writeFileSync(stylesPath, styles);
  console.log("[ensure-android-release-config] patched AppTheme navigation/window background");
}
