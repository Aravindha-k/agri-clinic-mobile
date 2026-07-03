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
  "android.permission.POST_NOTIFICATIONS"
];
for (const perm of requiredPerms) {
  if (!manifest.includes(perm)) {
    const line = `  <uses-permission android:name="${perm}"/>\n`;
    manifest = manifest.replace(/(<manifest[^>]*>\n)/, `$1${line}`);
  }
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

const rawDir = resolve(androidDir, "app/src/main/res/raw");
mkdirSync(rawDir, { recursive: true });
for (const name of ["water_pour.wav", "heat.wav"]) {
  const source = resolve(ROOT, "assets/sounds", name);
  if (existsSync(source)) {
    copyFileSync(source, resolve(rawDir, name));
  }
}
console.log("[ensure-android-release-config] synced notification sounds");
