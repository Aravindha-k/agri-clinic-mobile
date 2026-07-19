/**
 * Fail-safe location permission handling — static regression checks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function must(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(src.includes(needle), `${label}: missing "${needle}" in ${file}`);
  }
}

function mustNot(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(!src.includes(needle), `${label}: unexpected "${needle}" in ${file}`);
  }
}

must(
  "src/features/fieldTrackingSetup/locationStates.ts",
  [
    "foreground_permission_missing",
    "foreground_permission_blocked",
    "precise_location_disabled",
    "background_permission_missing",
    "location_services_disabled",
    "unsupported_in_expo_go",
    "capture_timeout",
    "Location access needed",
    "Location permission is disabled. Enable it from app settings to use field tracking.",
    "Phone location is turned off",
    "logLocationPermission"
  ],
  "classified states + recovery copy"
);

must(
  "src/features/fieldTrackingSetup/locationPermissionService.ts",
  [
    "PROMPT_COOLDOWN_MS",
    "prompt_suppressed_cooldown",
    "probe_result",
    "Never throws",
    "recheckLocationAfterSettingsReturn",
    "promptFixLocationAccess"
  ],
  "cooldown + safe probe"
);

must(
  "src/features/duty/store/DutyContext.tsx",
  ["ensureLocationReadyForWorkday", "promptFixLocationAccess", "return null"],
  "startDuty never throws on GPS fail"
);

mustNot(
  "src/features/duty/store/DutyContext.tsx",
  ["throw new Error(locationResult.message)"],
  "no throw on location capture fail"
);

must(
  "src/storage/TrackingContext.tsx",
  [
    "tracking_deferred_permission_missing",
    "tracking_stopped_permission_revoked",
    "getLastKnownPositionAsync",
    "return null"
  ],
  "tracking revoke + deferred"
);

must(
  "src/tracking/trackingDevLog.ts",
  ["tracking_deferred_permission_missing", "tracking_stopped_permission_revoked"],
  "tracking log events"
);

must(
  "mobile/lib/visit/visitGpsCapture.ts",
  ['reason: "timeout"', "capture_blocked"],
  "visit GPS timeout classified"
);

must(
  "mobile/app/visit/create-step4-review.tsx",
  ["lastRecheckAt", "4_000"],
  "review AppState cooldown"
);

must(
  "src/components/ui/BottomNav.tsx",
  ["ensureLocationReadyForWorkday", "promptFixLocationAccess"],
  "BottomNav gated start"
);

must(
  "src/components/map/MapErrorBoundary.tsx",
  ["CompanyLogo", "Retry", "Map unavailable"],
  "map fallback with logo + retry"
);

// Startup must not wait on location
mustNot(
  "App.tsx",
  ["ensureLocationReadyForWorkday", "probeLocationReadiness", "requestForegroundPermissionsAsync"],
  "startup not blocked by location"
);

mustNot(
  "src/storage/AuthContext.tsx",
  ["ensureLocationReadyForWorkday", "requestForegroundPermissionsAsync"],
  "auth not blocked by location"
);

console.log("PASS location-failsafe");
