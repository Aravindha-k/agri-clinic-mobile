/**
 * Verify AndroidManifest.xml contains a non-placeholder Google Maps API key.
 * Run after `expo prebuild --platform android`.
 *
 * Never prints the full API key — only length and a masked fingerprint.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(ROOT, "android/app/src/main/AndroidManifest.xml");
const META_NAME = "com.google.android.geo.API_KEY";

const INVALID_VALUES = new Set([
  "",
  "YOUR_GOOGLE_MAPS_ANDROID_API_KEY",
  "your API key",
  "undefined",
  "null"
]);

function extractMapsApiKey(manifest) {
  const patterns = [
    new RegExp(`android:name="${META_NAME}"\\s+android:value="([^"]*)"`, "i"),
    new RegExp(`android:value="([^"]*)"\\s+android:name="${META_NAME}"`, "i")
  ];
  for (const pattern of patterns) {
    const match = manifest.match(pattern);
    if (match) return match[1]?.trim() ?? "";
  }
  return null;
}

function maskKey(value) {
  if (value.length < 8) return "(too short)";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

if (!existsSync(manifestPath)) {
  console.error("[verify-android-maps-config] android/app/src/main/AndroidManifest.xml not found");
  console.error("Run: npx expo prebuild --platform android");
  process.exit(1);
}

const manifest = readFileSync(manifestPath, "utf8");
const value = extractMapsApiKey(manifest);

if (value == null) {
  console.error(
    `[verify-android-maps-config] Missing <meta-data android:name="${META_NAME}" …/> in AndroidManifest.xml`
  );
  process.exit(1);
}

if (INVALID_VALUES.has(value)) {
  console.error(
    "[verify-android-maps-config] Google Maps API key metadata is empty or still a placeholder"
  );
  process.exit(1);
}

console.log(
  `[verify-android-maps-config] OK — ${META_NAME} present (${value.length} chars, ${maskKey(value)})`
);
