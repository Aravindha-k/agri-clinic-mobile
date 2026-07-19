#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

const mustMatch = [
  ["mobile/components/duty/StartWorkDayCard.tsx", [/accessibilityLabel=\{t\("a11y\.startWorkday"\)\}/, /accessibilityHint=\{t\("a11y\.startWorkdayHint"\)\}/]],
  ["src/components/ui/VisitFabTabButton.tsx", [/accessibilityRole="button"/, /accessibilityHint=\{t\("a11y\.openNewVisitHint"\)\}/, /usePremiumMotion/]],
  ["mobile/components/duty/SyncStatusBadge.tsx", [/accessibilityLiveRegion="polite"/, /a11y\.syncPending_/]],
  ["mobile/components/duty/GpsStatusBadge.tsx", [/accessibilityRole="text"/, /workdayUx\.gpsOff/, /a11y\.gpsActive/]],
  ["mobile/components/duty/DutyMapCard.tsx", [/a11y\.mapSummary/, /accessibilityRole="summary"/]],
  ["src/screens/LoginScreen.tsx", [/accessibilityRole="header"/, /accessibilityRole="alert"/, /t\("login\./]],
  ["mobile/components/work/WorkQueuePanel.tsx", [/a11y\.filterByVillage/, /a11y\.clearVillageFilter/, /hitSlop/]],
  ["mobile/app/visit/[id].tsx", [/a11y\.goBack/, /a11y\.editVisit/, /a11y\.closeViewer/]],
  ["mobile/app/(tabs)/profile.tsx", [/accessibilityRole="button"/, /accessibilityState=\{\{\s*selected/]],
  ["src/utils/a11yAnnounce.ts", [/announceForAccessibility/]],
  ["mobile/app/(tabs)/index.tsx", [/announceA11y\(t\("a11y\.workdayStarted"\)\)/]],
  ["mobile/app/tracking.tsx", [/DayCompactSummary/, /DutyMapCard/]]
];

for (const [file, patterns] of mustMatch) {
  const src = read(file);
  for (const pattern of patterns) {
    assert.match(src, pattern, `${file} missing ${pattern}`);
  }
}

const footer = read("mobile/components/duty/WorkdayActionFooter.tsx");
assert.doesNotMatch(footer, /position:\s*"absolute"/);

console.log(`Accessibility active-V2 checks passed (${mustMatch.length} surfaces).`);
