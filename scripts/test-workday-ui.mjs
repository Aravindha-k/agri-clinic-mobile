import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Home uses essential Today dashboard without KPI target grid or end controls", () => {
  const home = read("mobile/app/(tabs)/index.tsx");
  assert.match(home, /StartWorkDayCard/);
  assert.match(home, /TodayCompactStatusCard/);
  assert.match(home, /TodayEssentialsRow/);
  assert.match(home, /useDutyTimer\(\)/);
  assert.match(home, /useDutyPresentation\(/);
  assert.doesNotMatch(home, /TodayKpiGrid/);
  assert.doesNotMatch(home, /WorkdayStartPanel/);
  assert.doesNotMatch(home, /WorkdayHero/);
  assert.doesNotMatch(home, /endDuty|End Workday|onEndWorkday/);
  assert.doesNotMatch(home, /<DutyTimer|from "\.\/DutyTimer"|DutyTimer elapsed/);
});

test("Day screen is compact summary plus full-page map without end controls", () => {
  const day = read("mobile/app/tracking.tsx");
  assert.match(day, /DayCompactSummary/);
  assert.match(day, /DutyMapCard/);
  assert.match(day, /fill/);
  assert.match(day, /useDutyTimer\(\)/);
  assert.doesNotMatch(day, /DutyTimeline/);
  assert.doesNotMatch(day, /DayRouteSummary/);
  assert.doesNotMatch(day, /DayFooterSummary/);
  assert.doesNotMatch(day, /DayWorkdayDetailsCard/);
  assert.doesNotMatch(day, /WorkdayActionFooter/);
  assert.doesNotMatch(day, /handleEndWorkday|onEndWorkday|endDuty/);
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

test("Duty map card uses DutyContext map with marker-only Start/Visit/End framing", () => {
  const mapCard = read("mobile/components/duty/DutyMapCard.tsx");
  assert.match(mapCard, /const \{ currentDuty, dutyMap, refreshDutyMap \} = useDuty\(\);/);
  assert.match(mapCard, /onMarkerPress/);
  assert.match(mapCard, /buildEmployeeDayMapMarkers/);
  assert.doesNotMatch(mapCard, /readPendingVisits/);
  assert.doesNotMatch(mapCard, /current-live/);
  assert.match(mapCard, /fitFieldMapRegion/);
  assert.match(mapCard, /cameraMode="cappedRegion"/);
  assert.match(mapCard, /cameraFitKey/);
  assert.match(mapCard, /followsUserLocation=\{false\}/);
  assert.match(mapCard, /legendRouteEnd/);
  assert.match(mapCard, /spreadDuplicateMapCoordinates/);
  assert.match(mapCard, /handleRecenter|handleFitAll|scan-outline/);
  assert.doesNotMatch(mapCard, /fetchVisitsForMapMarkers/);
  assert.doesNotMatch(mapCard, /sampleRouteForFit/);
  assert.doesNotMatch(mapCard, /route=\{dutyMap/);
  assert.match(mapCard, /route=\{\[\]\}/);
});

test("Day Expo Go banner is compact, dismissible, and Expo-Go-only", () => {
  const day = read("mobile/app/tracking.tsx");
  const runtime = read("src/utils/expoRuntime.ts");
  assert.match(day, /shouldShowExpoGoDevWarning/);
  assert.match(day, /expoGoBannerDismissedThisSession/);
  assert.match(day, /Expo Go limits background tracking/);
  assert.doesNotMatch(day, /Open builds/);
  assert.match(runtime, /__DEV__\s*&&\s*isExpoGo\(\)/);
});

test("Employee end-duty API client is hard-blocked", () => {
  const tracking = read("src/api/tracking.ts");
  assert.match(tracking, /EMPLOYEE_END_FORBIDDEN/);
  assert.match(tracking, /Employees cannot end the workday manually/);
  assert.doesNotMatch(tracking, /dutyTrackingPost\(\s*DUTY_TRACKING_ROUTES\.end/);
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
  assert.doesNotMatch(legacyPanel, /onEnd \?/);
});
