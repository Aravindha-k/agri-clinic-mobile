/**
 * Regression test — final stabilization round.
 *
 * Pins: (1) the completed-workday card offers same-day restart (backend
 * allows a new DutySession; only one *active* at a time), (2) the
 * workday-required sheet surfaces start failures instead of a silent
 * dead-end, and (3) media permission denials offer Open Settings only on
 * permanent denial (canAskAgain === false), never automatically.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const completedCard = readFileSync("mobile/components/duty/CompletedWorkDayCard.tsx", "utf8");
const todayScreen = readFileSync("mobile/app/(tabs)/index.tsx", "utf8");
const workdaySheet = readFileSync("mobile/components/workday/WorkdayRequiredSheet.tsx", "utf8");
const visitShell = readFileSync("mobile/app/visit/index.tsx", "utf8");
const mediaAlert = readFileSync("src/utils/mediaPermissionAlert.ts", "utf8");
const evidencePickers = readFileSync("src/visit/visitEvidencePickers.ts", "utf8");
const evidenceCapture = readFileSync("mobile/lib/visitEvidenceCapture.ts", "utf8");
const visitPhotos = readFileSync("mobile/lib/visitPhotos.ts", "utf8");
const profilePick = readFileSync("src/utils/profileImagePick.ts", "utf8");
const en = readFileSync("src/i18n/en.ts", "utf8");
const ta = readFileSync("src/i18n/ta.ts", "utf8");

test("completed workday card exposes a same-day restart action", () => {
  assert.match(completedCard, /onStartAgain/);
  assert.match(completedCard, /startWorkdayAgain/);
  assert.match(completedCard, /completedShiftHint/);
  assert.match(completedCard, /PrimaryButton/);
});

test("today screen wires restart through the existing start-workday handler", () => {
  assert.match(todayScreen, /onStartAgain=\{\(\) => void handleStartWorkday\(\)\}/);
  assert.match(todayScreen, /error=\{visibleTrackingError\}/);
  assert.match(todayScreen, /starting=\{starting\}/);
});

test("restart strings exist in both locales", () => {
  for (const src of [en, ta]) {
    assert.match(src, /startWorkdayAgain:/);
    assert.match(src, /completedShiftHint:/);
  }
});

test("workday-required sheet renders the start error instead of failing silently", () => {
  assert.match(workdaySheet, /error\?: string \| null/);
  assert.match(workdaySheet, /\{error \? <Text style=\{styles\.error\}>\{error\}<\/Text> : null\}/);
  assert.match(visitShell, /bootstrapError: dutyStartError/);
  assert.match(visitShell, /error=\{dutyStartError\}/);
});

test("media denial helper opens Settings only on permanent denial and only on tap", () => {
  assert.match(mediaAlert, /canAskAgain === false/);
  assert.match(mediaAlert, /openSettings/);
  assert.doesNotMatch(mediaAlert, /Linking\.openSettings\(\);\s*\}\)\s*;/, "must not auto-open Settings");
});

test("all media pickers route denials through the helper with canAskAgain", () => {
  for (const src of [evidencePickers, evidenceCapture, visitPhotos, profilePick]) {
    assert.match(src, /alertMediaPermissionDenied/);
    assert.match(src, /canAskAgain: perm\.canAskAgain/);
  }
});
