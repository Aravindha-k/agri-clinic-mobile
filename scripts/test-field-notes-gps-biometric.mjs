/**
 * Regression: Field Notes-only visits, VisitGPS capture, biometric logout/session policy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function mustInclude(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(src.includes(needle), `${label}: missing "${needle}" in ${file}`);
  }
}

function mustNotInclude(file, needles, label) {
  const src = read(file);
  for (const needle of needles) {
    assert.ok(!src.includes(needle), `${label}: unexpected "${needle}" in ${file}`);
  }
}

// --- Field Notes ---
mustInclude(
  "mobile/app/visit/create-step3.tsx",
  ["fieldNotes", "visitFlow.fieldNotes", "setFieldNotes"],
  "step3 field notes input"
);
mustNotInclude(
  "mobile/app/visit/create-step3.tsx",
  ["setObservation", "setRecommendation", "visitFlow.observation", "visitFlow.recommendation"],
  "step3 no obs/rec inputs"
);

mustInclude(
  "mobile/app/visit/create-step4-review.tsx",
  ["visitFlow.fieldNotes", "visitFlow.noFieldNotes", "onEditStep3", "captureVisitGps"],
  "review field notes + gps"
);
mustNotInclude(
  "mobile/app/visit/create-step4-review.tsx",
  ["observationOptional", "recommendationOptional", "visitFlow.observation", "visitFlow.recommendation"],
  "review no obs/rec sections"
);

mustInclude(
  "mobile/lib/visitSubmitApi.ts",
  ["fieldNotes", "observation: visitNotes", "recommendation: undefined"],
  "payload maps fieldNotes → observation only"
);
mustNotInclude(
  "mobile/lib/visitSubmitApi.ts",
  ["recommendation: visitNotes", "recommendation: state.fieldNotes"],
  "must not duplicate Field Notes into recommendation"
);

mustInclude(
  "mobile/lib/visitDetailApi.ts",
  ["visitFieldNotesText", "parseFieldNotes"],
  "legacy merge helper"
);
mustInclude(
  "mobile/app/visit/[id].tsx",
  ["visitFieldNotesText", "visitFlow.fieldNotes", "visitFlow.noFieldNotes"],
  "detail field notes only"
);
mustNotInclude(
  "mobile/app/visit/[id].tsx",
  ["draftObservation", "draftRecommendation", "visitFlow.observation", "visitFlow.recommendation"],
  "detail no separate obs/rec editors"
);

mustInclude(
  "mobile/components/visits/PendingVisitDetail.tsx",
  ["visitFlow.fieldNotes"],
  "pending uses field notes label"
);

mustInclude("src/i18n/en.ts", ["noFieldNotes", "fieldNotesEvidence", "gpsGettingLocation"], "en keys");
mustInclude("src/i18n/ta.ts", ["noFieldNotes", "fieldNotesEvidence", "gpsGettingLocation"], "ta keys");

// --- GPS ---
mustInclude(
  "mobile/lib/visit/visitGpsCapture.ts",
  [
    "[VisitGPS]",
    "capture_started",
    "capture_success",
    "capture_timeout",
    "cached_fix_used",
    "Accuracy.High",
    "getLastKnownPositionAsync"
  ],
  "gps capture module"
);
mustInclude(
  "mobile/app/visit/create-step4-review.tsx",
  [
    "gpsGettingLocation",
    "gpsPermissionRequired",
    "gpsTurnOnPhone",
    "gpsCouldNotGet",
    "gpsFixLocationAccess",
    "gpsOpenLocationSettings",
    "gpsRetry",
    "submit_location_validated",
    "review_location_ready"
  ],
  "review gps states"
);
mustInclude(
  "mobile/lib/visit/visitSubmitCoordinator.ts",
  ["captureVisitGps", "visitGpsIsUsable", "submit_location_validated"],
  "submit gps guard"
);

// --- Biometric ---
mustInclude(
  "src/storage/biometricLoginStorage.ts",
  ['outcome: "network_error"', 'outcome: "server_error"', "SESSION_REPLACED"],
  "biometric network vs expiry outcomes"
);
mustInclude(
  "src/storage/AuthContext.tsx",
  [
    'result.outcome === "network_error"',
    "refresh_rejected_after_biometric",
    'reason: "explicit_logout"',
    "setPreferPasswordLoginThisSession(true)"
  ],
  "auth keeps session on network; logout clears tokens"
);
mustNotInclude(
  "src/storage/AuthContext.tsx",
  ["sign_out_biometric_lock"],
  "logout must not soft-lock with retained tokens"
);

console.log("test-field-notes-gps-biometric: PASS");
