#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

const motionSurfaces = [
  "src/components/ui/VisitFabTabButton.tsx",
  "mobile/components/today/HomeLogoHero.tsx",
  "mobile/components/ui/FadeInSection.tsx",
  "mobile/components/ui/ShimmerBlock.tsx",
  "mobile/components/ui/Skeleton.tsx",
  "src/components/brand/KavyaCinematicSplash.tsx",
  "mobile/app/visit/success.tsx"
];

for (const file of motionSurfaces) {
  const src = read(file);
  assert.match(src, /usePremiumMotion/, `${file} must consult usePremiumMotion`);
}

const fab = read("src/components/ui/VisitFabTabButton.tsx");
assert.match(fab, /reduced/);
assert.match(fab, /if\s*\(!reduced\)|if\s*\(reduced\)|coreMotion|!reduced/);

const skeleton = read("mobile/components/ui/Skeleton.tsx");
assert.match(skeleton, /if\s*\(!coreMotion\)/);

const splash = read("src/components/brand/KavyaCinematicSplash.tsx");
assert.match(splash, /preferLight|reduced/);

console.log("Reduced-motion checks passed.");
