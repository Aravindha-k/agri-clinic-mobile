import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("FieldMapView renders the base map without requiring markers (Tamil Nadu fallback)", () => {
  const src = read("src/components/map/FieldMapView.tsx");
  // canRenderMap must not gate on hasRenderableCoordinates anymore.
  const canRender = src.slice(
    src.indexOf("const canRenderMap = useMemo("),
    src.indexOf("const allowFollowUser")
  );
  assert.ok(canRender.length > 0, "canRenderMap block found");
  assert.doesNotMatch(canRender, /if \(!hasRenderableCoordinates\) return false;/);
  // Region always sanitized; sanitizeRegion falls back to the Tamil Nadu default.
  assert.match(src, /sanitizeRegion\(region\)/);
  // Empty state is overlaid on top of the rendered map, not a replacement.
  assert.match(src, /canRenderMap && !hasRenderableCoordinates/);
});

test("Tamil Nadu fallback region is a valid centered default", () => {
  const region = read("src/utils/mapRegion.ts");
  assert.match(region, /DEFAULT_MAP_REGION/);
  assert.match(region, /latitude:\s*11\.1271/);
  assert.match(region, /longitude:\s*78\.6569/);
  // Invalid coordinates always resolve to the fallback.
  assert.match(region, /if \(!hasValidMapCoords\(lat, lng\)\) \{\s*return \{ \.\.\.DEFAULT_MAP_REGION \};/);
});

test("Map exposes structured release-safe logs and never logs the key value", () => {
  const debug = read("src/utils/mapDebug.ts");
  for (const event of [
    "component_mounted",
    "api_key_configured",
    "permission_status",
    "gps_status",
    "initial_region",
    "location_success",
    "location_error",
    "markers_count"
  ]) {
    assert.match(debug, new RegExp(`"${event}"`), `logs ${event}`);
  }
  const field = read("src/components/map/FieldMapView.tsx");
  // Only whether native maps is configured — never the raw key.
  assert.match(field, /api_key_configured", \{ mapsNativeConfigured \}/);
  assert.doesNotMatch(field, /GOOGLE_MAPS_ANDROID_API_KEY/);
});

test("Google Maps release verification rejects placeholder keys", () => {
  const verify = read("scripts/verify-google-maps-release.mjs");
  assert.match(verify, /"local-build-placeholder"/);
  assert.match(verify, /function isPlaceholderKey/);
  assert.match(verify, /includes\("placeholder"\)/);
});

test("Biometric login uses a single-prompt guard and one attempt per launch", () => {
  const bio = read("src/storage/biometricLoginStorage.ts");
  assert.match(bio, /let biometricPromptInProgress = false;/);
  assert.match(bio, /let unlockAttemptedThisLaunch = false;/);
  assert.match(bio, /export function hasAttemptedBiometricUnlockThisLaunch/);
  assert.match(bio, /export function markBiometricUnlockAttempted/);
  // Both authenticate sites are guarded against duplicate concurrent prompts.
  const promptGuards = bio.match(/if \(biometricPromptInProgress\) \{/g) ?? [];
  assert.ok(promptGuards.length >= 2, "both prompt sites guarded");
  assert.match(bio, /prompt_suppressed_duplicate/);
});

test("Login auto-prompt is guarded by the per-launch attempt, not a per-mount ref", () => {
  const login = read("src/screens/LoginScreen.tsx");
  assert.match(login, /hasAttemptedBiometricUnlockThisLaunch\(\)/);
  assert.match(login, /markBiometricUnlockAttempted\(\)/);
  // The old per-mount ref must be gone so navigation/remounts cannot re-prompt.
  assert.doesNotMatch(login, /autoBiometricAttempted/);
});

test("Password login never persists a plaintext password", () => {
  const bio = read("src/storage/biometricLoginStorage.ts");
  // readBiometricCredentials is deprecated and always returns null.
  assert.match(bio, /export async function readBiometricCredentials\(\): Promise<null>/);
  assert.doesNotMatch(bio, /AsyncStorage/);
});

test("Background-location lifecycle keys off primitive workday id, not callbacks", () => {
  const ctx = read("src/storage/TrackingContext.tsx");
  // Stable refs exist for the tracking callbacks.
  assert.match(ctx, /const resumeTrackingRef = useRef\(resumeActiveWorkdayTracking\);/);
  assert.match(ctx, /const stopAllTrackingLoopsRef = useRef\(stopAllTrackingLoops\);/);
  // Active-workday effect depends only on the primitive id.
  assert.match(ctx, /void resumeTrackingRef\.current\(\);\s*\n\s*return \(\) => stopAllTrackingLoopsRef\.current\(\);\s*\n\s*\}, \[activeWorkdayId\]\);/);
  // Battery-saver effect only cycles tracking when the setting actually changes.
  assert.match(ctx, /const prevBatterySaverRef = useRef\(trackingBatterySaver\);/);
  assert.match(ctx, /const changed = prevBatterySaverRef\.current !== trackingBatterySaver;/);
  assert.match(ctx, /if \(!activeWorkdayId \|\| !changed\) \{/);
});

test("Background start is idempotent (guards on already-started before starting)", () => {
  const svc = read("src/tracking/backgroundLocationService.ts");
  assert.match(svc, /hasStartedLocationUpdatesAsync\(BACKGROUND_LOCATION_TASK\)/);
  assert.match(svc, /if \(already\) \{/);
  assert.match(svc, /return \{ ok: true, alreadyRunning: true \};/);
});

test("Elapsed workday timer cannot be duplicated", () => {
  const ctx = read("src/storage/TrackingContext.tsx");
  const loop = ctx.slice(ctx.indexOf("const startElapsedLoop = useCallback("));
  assert.match(loop.slice(0, 200), /if \(elapsedIntervalRef\.current\) \{\s*\n\s*return;/);
});
