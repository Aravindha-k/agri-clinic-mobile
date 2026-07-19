/**
 * Static verification of one-time Field Tracking permission onboarding.
 * Device/OEM runtime matrix still needs a physical phone (not Expo Go for BG).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

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

// Module surface
must(
  "src/features/fieldTrackingSetup/types.ts",
  ["FIELD_TRACKING_SETUP_VERSION = 1", "foreground", "background", "precise", "battery", "notifications"],
  "setup version + steps"
);

must(
  "src/features/fieldTrackingSetup/persistence.ts",
  ["field_tracking_setup_v", "lastCompletedVersion", "markFieldTrackingSetupCompleted"],
  "versioned persistence"
);

must(
  "src/features/fieldTrackingSetup/probe.ts",
  [
    "requiresBackgroundLocationSeparate",
    "requiresNotificationPermission",
    "listMissingCriticalSteps",
    "shouldOfferFieldTrackingSetup",
    "expoGoLimited"
  ],
  "probe + offer rules"
);

// Android version behaviour
must(
  "src/features/fieldTrackingSetup/actions.ts",
  [
    "requestForegroundPermissionsAsync",
    "requestBackgroundPermissionsAsync",
    "androidAtLeast(30)",
    "Allow all the time",
    "Precise Location",
    "runNotificationStep",
    "openBatteryOptimizationSettings"
  ],
  "version-specific actions"
);

// Settings intents + safe fallback
must(
  "src/features/fieldTrackingSetup/settingsIntents.ts",
  [
    "APPLICATION_DETAILS_SETTINGS",
    "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    "IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
    "Linking.openSettings",
    "openOemOrAppSettings"
  ],
  "settings deep links + fallback"
);

must(
  "src/features/fieldTrackingSetup/manufacturer.ts",
  ["xiaomi", "oppo", "realme", "vivo", "samsung", "oneplus", "motorola", "Autostart", "Unrestricted"],
  "OEM guidance"
);

// UI screen
must(
  "src/screens/FieldTrackingSetupScreen.tsx",
  [
    "Enable Field Tracking",
    "Continue",
    "Try Again",
    "Open Location Settings",
    "Open Battery Settings",
    "development build or field APK",
    "AppState",
    "Kavya Field uses your location"
  ],
  "setup screen"
);

// Navigation + login offer (password login only path)
must(
  "src/navigation/types.ts",
  ["FieldTrackingSetup"],
  "nav types"
);

must(
  "src/navigation/RootNavigator.tsx",
  ["FieldTrackingSetup", "FieldTrackingSetupScreen"],
  "nav registration"
);

must(
  "src/screens/LoginScreen.tsx",
  ["maybeOfferFieldTrackingSetupAfterLogin"],
  "post-password-login offer"
);

// Start Workday guard
must(
  "mobile/app/(tabs)/index.tsx",
  [
    "ensureFieldTrackingReadyForWorkday",
    "showFieldTrackingNeedsAttentionAlert",
    "focusMissing"
  ],
  "Start Workday guard"
);

must(
  "src/features/fieldTrackingSetup/workdayGuard.ts",
  ["Tracking setup needs attention", "Fix Now", "offeredThisSession"],
  "workday guard wording + one-shot session"
);

// Settings entry
must(
  "src/screens/SettingsScreen.tsx",
  ["settings.fieldTrackingSetup", "FieldTrackingSetup", "getFieldTrackingHealth"],
  "Settings Field Tracking row"
);

must(
  "src/i18n/en.ts",
  ["fieldTrackingSetup", "fieldTrackingReady", "fieldTrackingNeedsAttention"],
  "en strings"
);

must(
  "src/i18n/ta.ts",
  ["fieldTrackingSetup", "fieldTrackingReady", "fieldTrackingNeedsAttention"],
  "ta strings"
);

// Manifest permission for battery exemption request
must(
  "app.config.js",
  ["REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", "ACCESS_BACKGROUND_LOCATION", "POST_NOTIFICATIONS"],
  "android permissions"
);

// Do not request all permissions on splash / App bootstrap
mustNot(
  "App.tsx",
  ["requestBackgroundPermissionsAsync", "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", "FieldTrackingSetup"],
  "no splash permission spam"
);

// Canonical permission service
must(
  "src/features/fieldTrackingSetup/locationPermissionService.ts",
  [
    "probeLocationReadiness",
    "ensureLocationReadyForWorkday",
    "ensureLocationReadyForVisit",
    "openLocationSettings",
    "requestForegroundLocation",
    "requestBackgroundLocation",
    "temporaryForegroundLikely"
  ],
  "canonical location permission service"
);

must(
  "src/features/fieldTrackingSetup/persistence.ts",
  ["syncFieldTrackingPermissionSnapshot", "preciseLocationConfirmed", "temporaryForegroundLikely"],
  "permission snapshot persistence"
);

// Visit / Review / submit must never request OS permission dialogs
const noRequestSurfaces = [
  "mobile/app/visit/create-step4-review.tsx",
  "mobile/app/visit/create-step1.tsx",
  "mobile/lib/visit/visitGpsCapture.ts",
  "mobile/lib/visit/visitSubmitCoordinator.ts",
  "src/utils/locationRequiredModal.ts",
  "src/utils/location.ts",
  "src/utils/workdayLocationGate.ts",
  "src/features/duty/store/DutyContext.tsx",
  "src/components/ui/VisitFabTabButton.tsx"
];

for (const file of noRequestSurfaces) {
  mustNot(
    file,
    ["requestForegroundPermissionsAsync", "requestBackgroundPermissionsAsync"],
    `no OS request — ${file}`
  );
}

must(
  "mobile/lib/visit/visitGpsCapture.ts",
  ["checkForegroundPermission", "Never requests"],
  "visit GPS check-only"
);

must(
  "src/utils/location.ts",
  ["return checkForegroundPermission()", "return ensureWorkdayStartPermissions()"],
  "legacy helpers are check-only"
);

console.log("PASS field-tracking-setup static checks");
