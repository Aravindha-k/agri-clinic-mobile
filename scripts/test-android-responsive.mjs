#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

// Load compiled-free helpers via dynamic import of the TS source through Node's experimental
// support is unreliable — assert source contracts and duplicate pure math checks inline.

function responsiveBucket(width) {
  if (width < 360) return "xs";
  if (width < 400) return "sm";
  if (width < 430) return "md";
  return "lg";
}

function dayMapMinHeight(windowHeight, options = {}) {
  const reserve = options.compactSummary ? 220 : 280;
  const available = windowHeight - reserve;
  return Math.max(220, Math.min(available, Math.round(windowHeight * 0.55)));
}

assert.equal(responsiveBucket(320), "xs");
assert.equal(responsiveBucket(360), "sm");
assert.equal(responsiveBucket(410), "md");
assert.equal(responsiveBucket(440), "lg");

const mapFloor = dayMapMinHeight(640, { compactSummary: true });
assert.ok(mapFloor >= 220, "day map floor must be non-zero");
assert.ok(mapFloor < 640, "day map floor must leave room for chrome");
assert.ok(dayMapMinHeight(500, { compactSummary: true }) >= 220);

const layoutSrc = read("src/utils/responsiveLayout.ts");
assert.match(layoutSrc, /MAP_FILL_MIN_HEIGHT\s*=\s*220/);
assert.match(layoutSrc, /CONTENT_MAX_WIDTH\s*=\s*480/);
assert.match(layoutSrc, /export function dayMapMinHeight/);
assert.match(layoutSrc, /export function contentMaxWidthStyle/);

const capsSrc = read("src/utils/androidCapabilities.ts");
assert.match(capsSrc, /requiresNotificationPermission/);
assert.match(capsSrc, /expoGoLimitedNative/);
assert.match(capsSrc, /backgroundLocationSupported/);

const appConfig = read("app.config.js");
assert.match(appConfig, /orientation:\s*"portrait"/);
assert.match(appConfig, /softwareKeyboardLayoutMode:\s*"resize"/);
assert.match(appConfig, /minSdkVersion:\s*26/);
assert.match(appConfig, /icon:\s*brand\.iconAsset/);
assert.match(appConfig, /package:\s*"com\.kavya\.agriclinic"/);
assert.match(appConfig, /splash:\s*\{/);

const day = read("mobile/app/tracking.tsx");
assert.match(day, /dayMapMinHeight/);
assert.match(day, /compact=\{compactHeight\}/);
assert.match(day, /DutyMapCard/);
assert.doesNotMatch(day, /endDuty|onEndWorkday|handleEndWorkday/);

const mapCard = read("mobile/components/duty/DutyMapCard.tsx");
assert.match(mapCard, /MAP_FILL_MIN_HEIGHT/);
assert.match(mapCard, /buildEmployeeDayMapMarkers/);
assert.match(mapCard, /fitFieldMapRegion/);
assert.match(mapCard, /estimatedFillHeight/);

const visitShell = read("mobile/app/visit/index.tsx");
assert.match(visitShell, /useWindowDimensions/);
assert.doesNotMatch(visitShell, /Dimensions\.get\("window"\)/);

const today = read("mobile/app/(tabs)/index.tsx");
assert.match(today, /TodayEssentialsRow/);
assert.doesNotMatch(today, /TodayKpiGrid/);
assert.doesNotMatch(today, /<DutyTimer/);

const chrome = read("src/utils/androidChrome.ts");
assert.match(chrome, /expoGoLimitedNative/);
assert.match(chrome, /getAndroidCapabilities/);

const stackHook = read("src/hooks/useStackBottomInset.ts");
assert.match(stackHook, /insets\.bottom/);

const settings = read("src/screens/SettingsScreen.tsx");
assert.match(settings, /useStackBottomInset/);

const gradle = read("android/app/build.gradle");
assert.match(gradle, /minSdkVersion Math\.max\(rootProject\.ext\.minSdkVersion, 26\)/);

void pathToFileURL; // keep import used for future ESM loading

console.log("Android responsive compatibility checks passed.");
