/**
 * Static verification that background tracking checklist wiring is present.
 * Runtime proof still requires a device lock test on a dev/APK build (not Expo Go).
 *
 * Checklist covered:
 * 1–10 lock/resume GPS + flush + timer
 * minimize/resume, network replay, SESSION_REPLACED stop, auto-expiry stop, logout stop
 * Required logs: tracking_started, tracking_background, tracking_resume,
 *                tracking_queue_flush, tracking_stopped
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

// Required log events
must(
  "src/tracking/trackingDevLog.ts",
  [
    '"tracking_started"',
    '"tracking_background"',
    '"tracking_resume"',
    '"tracking_queue_flush"',
    '"tracking_stopped"'
  ],
  "log union"
);

must(
  "src/storage/TrackingContext.tsx",
  [
    '"tracking_started"',
    'trackingDevLog("tracking_background"',
    'trackingDevLog("tracking_resume"',
    'trackingDevLog("tracking_stopped"'
  ],
  "TrackingContext lifecycle logs"
);

must(
  "src/tracking/locationSyncService.ts",
  ['trackingDevLog("tracking_queue_flush"', "resumeFlushPromise", "client_point_id", "stopTrackingAfterDutyEnded"],
  "queue flush + client ids + duty stop"
);

// Background continues on lock/minimize
must(
  "src/storage/TrackingContext.tsx",
  ["tracking_background", "startBackgroundLocationTracking"],
  "background keepalive"
);

// FGS notification present
must(
  "src/tracking/backgroundLocationService.ts",
  ["foregroundService", "killServiceOnDestroy: false", "pausesUpdatesAutomatically: false"],
  "native FGS"
);

// SESSION_REPLACED stops tracking first
must(
  "src/storage/AuthContext.tsx",
  ["stopTrackingBridge", "session_replaced", "clearLocalFieldQueuesOnSessionReplace"],
  "SESSION_REPLACED stop-first"
);

// Logout / preSignOut stops tracking
must(
  "src/storage/TrackingContext.tsx",
  ["registerPreSignOut", "registerSessionTeardown", "registerSessionExpiredTeardown"],
  "teardown registries"
);

// Auto-expiry / inactive stops uploads
must(
  "src/tracking/locationSyncService.ts",
  ["isWorkdayInactiveMessage", "workday_inactive_or_expired", "duty_session_mismatch"],
  "inactive workday stop"
);

// Timer wall-clock + resume tick
must(
  "src/features/duty/hooks/useDutyTimer.ts",
  ["AppState", "Date.now()", "wall-clock"],
  "timer correctness"
);

// Auth gate — no uploads when locked/logged out
must(
  "src/tracking/trackingAuthGate.ts",
  ["canSendAuthenticatedRequests", "tracking_deferred_auth_not_ready"],
  "auth gate"
);

console.log("test-background-tracking-verification: PASS");
console.log("");
console.log("Manual device proof (dev build / APK — not Expo Go):");
console.log("  1. Start workday → expect [Tracking] tracking_started");
console.log("  2. Lock screen 10 min → expect [Tracking] tracking_background");
console.log("  3. Unlock → expect [Tracking] tracking_resume then tracking_queue_flush (once)");
console.log("  4. Confirm timer jumped forward correctly; map shows latest location");
console.log("  5. Second-device login → old device [Tracking] tracking_stopped");
console.log("  6. After auto-expiry / logout → [Tracking] tracking_stopped; no further uploads");
