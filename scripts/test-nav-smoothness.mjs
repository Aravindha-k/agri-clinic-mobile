/**
 * Navigation smoothness — farmer profile cache-first + deferred heavy work.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("farmer profile cache helpers exist with TTL", () => {
  const src = read("mobile/lib/farmerProfileCache.ts");
  assert.match(src, /readFreshFarmerProfileCache/);
  assert.match(src, /writeFarmerProfileCache/);
  assert.match(src, /FARMER_PROFILE_CACHE_TTL_MS/);
});

test("farmer detail seeds from cache/prefill and does not blank-load when seeded", () => {
  const screen = read("mobile/app/farmer/[id].tsx");
  assert.match(screen, /initialProfileFromRoute/);
  assert.match(screen, /seedMobileFarmerProfile/);
  assert.match(screen, /readFreshFarmerProfileCache/);
  assert.match(screen, /deferCanvas/);
  assert.match(screen, /loading && !profile/);
  assert.doesNotMatch(screen, /ScreenLoader/);
});

test("work queue passes farmer prefill into FarmerDetail", () => {
  const panel = read("mobile/components/work/WorkQueuePanel.tsx");
  assert.match(panel, /navigation\.push\("FarmerDetail"/);
  assert.match(panel, /prefill:\s*\{/);
  assert.match(panel, /profile_photo_url/);
});

test("profile fetch writes cache and limits visit pagination fallback", () => {
  const api = read("mobile/lib/farmerProfileApi.ts");
  assert.match(api, /writeFarmerProfileCache/);
  assert.match(api, /FARMER_PROFILE_VISIT_MAX_PAGES/);
  assert.match(api, /seedMobileFarmerProfile/);

  const farmers = read("src/api/farmers.ts");
  assert.match(farmers, /maxPages/);
  assert.match(farmers, /FARMER_PROFILE_VISIT_MAX_PAGES/);
});

test("secure screen and shells defer heavy work after interactions", () => {
  const secure = read("src/hooks/useSecureScreen.ts");
  assert.match(secure, /InteractionManager\.runAfterInteractions/);

  const shell = read("mobile/components/layout/ScreenEntranceShell.tsx");
  assert.match(shell, /deferCanvas/);
  assert.match(shell, /InteractionManager\.runAfterInteractions/);

  const backdrop = read("mobile/components/layout/PremiumFieldBackdrop.tsx");
  assert.match(backdrop, /useMemo/);
});

test("day/visits focus work is deferred or TTL soft-refreshed", () => {
  const day = read("mobile/app/tracking.tsx");
  assert.match(day, /InteractionManager\.runAfterInteractions/);

  const visits = read("mobile/components/work/WorkVisitsPanel.tsx");
  assert.match(visits, /lastVisitsFocusLoadRef/);
  assert.match(visits, /45_000/);
  assert.match(visits, /InteractionManager\.runAfterInteractions/);
});

test("visit detail loads gallery from visit media_files / media.images", () => {
  const visit = read("mobile/app/visit/[id].tsx");
  assert.match(visit, /fetchVisitDetail\(visitId\)/);
  assert.match(visit, /fetchVisitGallery\(visitId, row\)/);
  assert.doesNotMatch(visit, /admin\/visits\//);
});

test("farmer photo does not cache-bust with Date.now on every mount", () => {
  const avatar = read("mobile/components/farmers/FarmerPhotoAvatar.tsx");
  assert.match(avatar, /photoCacheVersion/);
  assert.doesNotMatch(avatar, /useState\(Date\.now\(\)\)/);

  const bust = read("src/utils/profilePhotoUrl.ts");
  assert.match(bust, /if \(version == null \|\| version === ""\) return resolved;/);
});
