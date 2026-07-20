/**
 * Today header branding — locked logo; orbit canvas adapts around it.
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

const TODAY_LOCKED_LOGO_XS = 102;
const TODAY_LOCKED_LOGO_SM = 118;
const TODAY_LOCKED_LOGO_MD = 128;
const TODAY_LOCKED_LOGO_LG = 141;
const TODAY_LOGO_ORBIT_RATIO = 0.64;
const TODAY_ORBIT_SAFE_FILL_MAX = 0.9;
const TODAY_LOGO_BREATH_MIN = 0.75;
const TODAY_LOGO_BREATH_MAX = 1.25;
const TODAY_LOGO_BREATH_HALF_MS = 1600;
const TODAY_PAGE_PAD = 16;
const HEADER_PAD_H = 12;
const BELL_RESERVE = 36;

function lockedLogo(w) {
  if (w < 360) return TODAY_LOCKED_LOGO_XS;
  if (w < 400) return TODAY_LOCKED_LOGO_SM;
  if (w < 430) return TODAY_LOCKED_LOGO_MD;
  return TODAY_LOCKED_LOGO_LG;
}

function minOrbit(logo) {
  return Math.ceil((logo * TODAY_LOGO_BREATH_MAX) / TODAY_ORBIT_SAFE_FILL_MAX);
}

function preferredOrbit(w) {
  return Math.round(lockedLogo(w) / TODAY_LOGO_ORBIT_RATIO);
}

function iconSize(orbit, compact) {
  if (compact) {
    if (orbit < 150) return 13;
    if (orbit < 180) return 15;
    return 17;
  }
  if (orbit < 140) return 14;
  if (orbit < 170) return 16;
  if (orbit < 200) return 18;
  return 20;
}

function chipSize(orbit, chipPad, compact) {
  return iconSize(orbit, compact) + chipPad * 2 + 2;
}

function canvasSize(orbit, chipPad, edgePad, compact) {
  return orbit + chipSize(orbit, chipPad, compact) + edgePad * 2;
}

function wordmarkMin(w) {
  if (w < 360) return 88;
  if (w < 400) return 108;
  return 118;
}

function columnGap(w, tight) {
  if (tight) {
    if (w < 360) return 6;
    if (w < 400) return 8;
    if (w < 430) return 10;
    return 12;
  }
  if (w < 360) return 8;
  if (w < 400) return 10;
  if (w < 430) return 12;
  return 14;
}

function leftInset(w, tight) {
  if (tight) {
    if (w < 360) return 6;
    if (w < 400) return 8;
    if (w < 430) return 10;
    return 12;
  }
  if (w < 360) return 8;
  if (w < 400) return 10;
  if (w < 430) return 12;
  return 14;
}

function canvasMax(w, tight, gap, inset) {
  const available =
    w - TODAY_PAGE_PAD * 2 - HEADER_PAD_H - wordmarkMin(w) - BELL_RESERVE - gap - inset;
  const softCap = w < 360 ? 160 : w < 400 ? 178 : w < 430 ? 194 : 208;
  return Math.max(120, Math.min(softCap, Math.floor(available)));
}

function measure(w) {
  const logo = lockedLogo(w);
  const minO = minOrbit(logo);
  let tight = false;
  let compact = false;
  let chipPad = 6;
  let edgePad = 5;
  let gap = columnGap(w, tight);
  let inset = leftInset(w, tight);
  let max = canvasMax(w, tight, gap, inset);
  let orbit = Math.max(preferredOrbit(w), minO);
  let canvas = canvasSize(orbit, chipPad, edgePad, compact);

  while (canvas > max && orbit > minO) {
    orbit -= 2;
    canvas = canvasSize(orbit, chipPad, edgePad, compact);
  }

  if (canvas > max) {
    tight = true;
    compact = true;
    chipPad = 3;
    edgePad = 4;
    gap = columnGap(w, true);
    inset = leftInset(w, true);
    max = canvasMax(w, true, gap, inset);
    orbit = Math.max(minO, Math.min(orbit, preferredOrbit(w)));
    canvas = canvasSize(orbit, chipPad, edgePad, compact);
    while (canvas > max && orbit > minO) {
      orbit -= 2;
      canvas = canvasSize(orbit, chipPad, edgePad, compact);
    }
  }

  if (orbit < minO) orbit = minO;
  canvas = canvasSize(orbit, chipPad, edgePad, compact);
  const chip = chipSize(orbit, chipPad, compact);
  return { logo, orbit, canvas, inset, gap, chip, edgePad };
}

assert.equal(TODAY_LOGO_BREATH_MIN, 0.75);
assert.equal(TODAY_LOGO_BREATH_MAX, 1.25);
assert.equal(TODAY_LOGO_BREATH_HALF_MS, 1600);
assert.equal(lockedLogo(320), 102);
assert.equal(lockedLogo(360), 118);
assert.equal(lockedLogo(412), 128);
assert.equal(lockedLogo(430), 141);

for (const w of [320, 360, 412, 430]) {
  const m = measure(w);
  assert.equal(m.logo, lockedLogo(w), `${w}: logo must stay locked`);
  assert.ok(m.orbit >= minOrbit(m.logo), `${w}: orbit ≥ min for locked logo`);
  assert.ok(m.logo * TODAY_LOGO_BREATH_MAX <= m.orbit * TODAY_ORBIT_SAFE_FILL_MAX + 0.5, `${w}: max zoom safe`);
  assert.ok(m.inset >= 6, `${w}: left inset non-negative`);
  const outer = m.orbit / 2 + m.chip / 2;
  assert.ok(outer <= m.canvas / 2 - m.edgePad + 0.5, `${w}: chip stays in canvas`);
}

must(
  "mobile/components/today/todayHeroLogoSizing.ts",
  [
    "TODAY_LOCKED_LOGO_XS = 102",
    "TODAY_LOCKED_LOGO_SM = 118",
    "TODAY_LOCKED_LOGO_MD = 128",
    "TODAY_LOCKED_LOGO_LG = 141",
    "todayLockedLogoSize",
    "TODAY_LOGO_BREATH_MIN = 0.75",
    "TODAY_LOGO_BREATH_MAX = 1.25",
    "TODAY_LOGO_BREATH_HALF_MS = 1_600",
    "todayMinOrbitForLockedLogo"
  ],
  "locked logo + breathe constants"
);

mustNot(
  "mobile/components/today/todayHeroLogoSizing.ts",
  ["Math.min(preferredLogo", "maxLogoForOrbit"],
  "must not shrink locked logo from orbit fit"
);

must(
  "mobile/components/today/HomeLogoHero.tsx",
  [
    "chipsOnTrack",
    "measured.edgePad",
    "measured.chipPad",
    "TODAY_LOGO_BREATH_MAX",
    "TODAY_LOGO_BREATH_HALF_MS"
  ],
  "orbit adapts; breathe locked"
);

mustNot(
  "mobile/components/today/HomeLogoHero.tsx",
  ["marginLeft: (orbitDiameter - stageSize)"],
  "no negative orbit shift"
);

must(
  "mobile/components/brand/BrandHeader.tsx",
  ["homeLogoGap", "homeLogoLeftInset", "paddingLeft: homeLogoLeftInset"],
  "safe inset + gap"
);

must("mobile/components/today/TodayHeader.tsx", ['layout="split"', "HomeLogoHero"], "Today split header");

console.log("PASS today-header-branding");
for (const w of [320, 360, 412, 430]) {
  const m = measure(w);
  console.log(
    `  ${w}dp → logo ${m.logo} (locked), orbit ${m.orbit}, canvas ${m.canvas}, inset ${m.inset}, gap ${m.gap}`
  );
}
process.exit(0);
