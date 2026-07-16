import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Home uses canonical duty dashboard cards and not WorkdayStartPanel", () => {
  const home = read("mobile/app/(tabs)/index.tsx");
  assert.match(home, /StartWorkDayCard/);
  assert.match(home, /ActiveWorkDayCard/);
  assert.match(home, /useDutyTimer\(\)/);
  assert.match(home, /useDutyPresentation\(/);
  assert.doesNotMatch(home, /WorkdayStartPanel/);
  assert.doesNotMatch(home, /WorkdayHero/);
});

test("Day screen is operational duty workspace without duplicate work controls", () => {
  const day = read("mobile/app/tracking.tsx");
  assert.match(day, /DutyStatusCard/);
  assert.match(day, /DutyMapCard/);
  assert.match(day, /DutySummary/);
  assert.match(day, /DutyTimeline/);
  assert.match(day, /WorkdayActionFooter/);
  assert.match(day, /useDutyTimer\(\)/);
  assert.doesNotMatch(day, /WorkdayStartPanel/);
  assert.doesNotMatch(day, /TodayKpiRow/);
  assert.doesNotMatch(day, /DaySummaryRouteCard/);
  assert.doesNotMatch(day, /onStart=/);
});

test("Profile shows compact duty chip without timer display", () => {
  const profile = read("mobile/app/(tabs)/profile.tsx");
  assert.match(profile, /useDutyPresentation/);
  assert.match(profile, /tabsNav\?\.navigate\("Day"\)/);
  assert.doesNotMatch(profile, /timerDisplay/);
  assert.doesNotMatch(profile, /WorkdayStartPanel/);
});

test("Duty map card uses DutyContext map only with marker press and no route polyline", () => {
  const mapCard = read("mobile/components/duty/DutyMapCard.tsx");
  assert.match(mapCard, /const \{ dutyMap \} = useDuty\(\);/);
  assert.match(mapCard, /onMarkerPress/);
  assert.doesNotMatch(mapCard, /route=/);
  assert.doesNotMatch(mapCard, /readPendingVisits/);
  assert.doesNotMatch(mapCard, /fetchVisitsForMapMarkers/);
});

test("Duty timer hook is sole HH:MM:SS formatter for active duty", () => {
  const timer = read("src/features/duty/hooks/useDutyTimer.ts");
  assert.match(timer, /elapsedDisplay: formatHms\(elapsedMs\)/);
  assert.match(timer, /remainingDisplay: formatHms\(remainingMs\)/);
  assert.match(timer, /serverTimeOffsetMs/);
});

test("Repository has no mobile WorkdayStartPanel imports outside legacy component", () => {
  const legacyPanel = read("mobile/components/workday/WorkdayStartPanel.tsx");
  assert.ok(legacyPanel.includes("export function WorkdayStartPanel"));
  const home = read("mobile/app/(tabs)/index.tsx");
  const day = read("mobile/app/tracking.tsx");
  assert.doesNotMatch(home, /WorkdayStartPanel/);
  assert.doesNotMatch(day, /WorkdayStartPanel/);
});
