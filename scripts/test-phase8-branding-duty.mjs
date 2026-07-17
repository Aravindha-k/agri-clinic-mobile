/**
 * Phase 8 branding: circular logo.png, no white plates in active brand surfaces.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

test("CompanyLogoMark is circular transparent logo.png mark", () => {
  const mark = read("src/components/brand/CompanyLogoMark.tsx");
  assert.match(mark, /LOGO_IMAGE/);
  assert.match(mark, /borderRadius:\s*size \/ 2/);
  assert.match(mark, /backgroundColor:\s*"transparent"/);
  assert.doesNotMatch(mark, /logo_icons|app_icon|adaptive_icon/);
});

test("BrandLogo no longer uses white square plates", () => {
  const brandLogo = read("src/components/brand/BrandLogo.tsx");
  assert.match(brandLogo, /CompanyLogoMark/);
  assert.doesNotMatch(brandLogo, /plate:\s*true/);
  assert.doesNotMatch(brandLogo, /backgroundColor:\s*"#FFFFFF"/);
});

test("Home and header badges use transparent circular shells", () => {
  for (const rel of [
    "mobile/components/brand/BrandLogoBadge.tsx",
    "mobile/components/today/HomeLogoHero.tsx",
    "mobile/components/brand/BrandInlineLogo.tsx"
  ]) {
    const text = read(rel);
    assert.match(text, /LOGO_IMAGE/);
    assert.doesNotMatch(text, /backgroundColor:\s*"#FFFFFF"/, rel);
  }
});

test("DutyMapCard does not draw route polylines", () => {
  const map = read("mobile/components/duty/DutyMapCard.tsx");
  assert.match(map, /startMarker/);
  assert.match(map, /visitMarkers/);
  assert.match(map, /currentLiveLocation/);
  assert.match(map, /endMarker/);
  assert.doesNotMatch(map, /route=\{/);
  assert.doesNotMatch(map, /routePoints/);
});

test("SESSION_REPLACED clears local field queues", () => {
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /clearLocalFieldQueuesOnSessionReplace/);
  const clearer = read("src/storage/clearLocalFieldQueues.ts");
  assert.match(clearer, /clearPendingGpsBuffer/);
  assert.match(clearer, /pendingVisits/);
});

test("Active workday card surfaces visits, farmers, and distance", () => {
  const card = read("mobile/components/duty/ActiveWorkDayCard.tsx");
  assert.match(card, /farmersToday/);
  assert.match(card, /distanceKm/);
  assert.match(card, /DutyTimer/);
});
