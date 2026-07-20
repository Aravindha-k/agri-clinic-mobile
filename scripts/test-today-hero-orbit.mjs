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

must("src/config/brand.ts", ["logo_circle_transparent.png"], "canonical logo asset");

must(
  "mobile/components/today/todayHeroLogoSizing.ts",
  [
    "TODAY_ORBIT_DURATION_MS = 11_000",
    "TODAY_LOGO_BREATH_MIN = 0.75",
    "TODAY_LOGO_BREATH_MAX = 1.25",
    "TODAY_LOCKED_LOGO_XS = 102",
    "todayLockedLogoSize",
    "todayOrbitCanvasSize",
    "todayLogoFitsOrbitAtMaxScale"
  ],
  "responsive Today sizing with locked logo"
);

must(
  "mobile/components/today/HomeLogoHero.tsx",
  [
    "chipsOnTrack",
    "TODAY_ORBIT_DURATION_MS",
    "TODAY_LOGO_BREATH_MAX",
    "LOGO_IMAGE",
    'resizeMode="contain"',
    "shouldAnimate",
    "shouldRunBrandingMotion",
    "cancelAnimation",
    "homeLogoGlow",
    "transform: [{ scale: breath.value }]"
  ],
  "Today hero canvas + breath + orbit"
);

mustNot(
  "mobile/components/today/HomeLogoHero.tsx",
  ["marginLeft: (orbitDiameter - stageSize)", "TODAY_LOGO_BREATH_MAX = 1.5"],
  "no off-screen margin; max scale 1.25"
);

must(
  "mobile/components/brand/AgriNatureMark.tsx",
  ["cancelAnimation", "chipsOnTrack", "Easing.linear", "chipPadOverride", "minimalTrack", "Crisp primary ring"],
  "orbit duration + on-track chips + refined track"
);

must("mobile/components/today/HomeLogoHero.tsx", ["shouldRunBrandingMotion", "shouldAnimate"], "reduced motion gates animation");

const agriIcons = read("mobile/components/brand/agriProductIcons.tsx");
const orbitKeys = [...agriIcons.matchAll(/key:\s*"(leaf|spray|seed|lab|tractor)"/g)].map((m) => m[1]);
assert.deepEqual(
  [...new Set(orbitKeys)].sort(),
  ["lab", "leaf", "seed", "spray", "tractor"].sort(),
  "orbit icon set must remain the approved five"
);

console.log("PASS today-hero-orbit");
process.exit(0);
