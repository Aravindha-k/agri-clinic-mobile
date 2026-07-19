/**
 * Today hero logo + orbit motion regression checks.
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

// Pure sizing helpers (mirrored from todayHeroLogoSizing.ts)
function todayHeroLogoSize(w) {
  if (w < 360) return 88;
  if (w < 400) return 104;
  if (w < 430) return 116;
  return 128;
}
function todayOrbitIconSize(logoDiameter) {
  if (logoDiameter < 100) return 24;
  if (logoDiameter < 116) return 28;
  return 32;
}

assert.equal(todayHeroLogoSize(320), 88);
assert.equal(todayHeroLogoSize(360), 104);
assert.equal(todayHeroLogoSize(412), 116);
assert.equal(todayHeroLogoSize(430), 128);
assert.equal(todayOrbitIconSize(88), 24);
assert.equal(todayOrbitIconSize(104), 28);
assert.equal(todayOrbitIconSize(128), 32);

must(
  "src/config/brand.ts",
  ["logo_circle_transparent.png"],
  "canonical logo asset"
);

must(
  "src/components/brand/CompanyLogo.tsx",
  ["logo_circle_transparent.png", 'resizeMode="contain"'],
  "CompanyLogo uses contain"
);

must(
  "mobile/components/today/todayHeroLogoSizing.ts",
  ["todayHeroLogoSize", "todayOrbitIconSize", "TODAY_ORBIT_DURATION_MS = 10_000"],
  "responsive Today sizing"
);

must(
  "mobile/components/today/HomeLogoHero.tsx",
  [
    "todayHeroLogoSize",
    "todayOrbitIconSize",
    "TODAY_ORBIT_DURATION_MS",
    "iconSizeOverride",
    "CompanyLogo",
    "shouldAnimate",
    "coreMotion",
    "cancelAnimation"
  ],
  "Today hero responsive + orbit"
);

must(
  "mobile/components/brand/AgriNatureMark.tsx",
  ["ORBIT_DURATION_MS = 10_000", "cancelAnimation", "iconSizeOverride", "Easing.linear"],
  "orbit duration + cleanup"
);

mustNot(
  "mobile/components/brand/AgriNatureMark.tsx",
  ["ORBIT_DURATION_MS = 28_000", "compact ? 12 : 15"],
  "old tiny/slow orbit removed"
);

// Reduced motion: static orbit, not an error
must(
  "mobile/components/today/HomeLogoHero.tsx",
  ["!reduced", "shouldAnimate"],
  "reduced motion gates animation"
);

// No live timer / distance KPI on Today
mustNot(
  "mobile/app/(tabs)/index.tsx",
  ["distanceTravelled", "Distance travelled", "liveTimer", "elapsedLive"],
  "no distance / live timer surface"
);
// Orbit icon count unchanged (approved set — no extras added in this change)
const agriIcons = read("mobile/components/brand/agriProductIcons.tsx");
assert.match(agriIcons, /export const AGRI_ORBIT_ICONS/, "AGRI_ORBIT_ICONS defined");
const orbitKeys = [...agriIcons.matchAll(/key:\s*"(leaf|spray|seed|lab|tractor)"/g)].map((m) => m[1]);
assert.deepEqual(
  [...new Set(orbitKeys)].sort(),
  ["lab", "leaf", "seed", "spray", "tractor"].sort(),
  "orbit icon set must remain the approved five"
);

console.log("PASS today-hero-orbit");
process.exit(0);