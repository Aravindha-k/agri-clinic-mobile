#!/usr/bin/env node
/**
 * Cross-device motion reliability regression checks.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

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

must(
  "src/hooks/usePremiumMotion.ts",
  [
    'MotionPreference = "full" | "reduced" | "unknown"',
    "buildMotionState(false, false, false)",
    "wantsFullMotion",
    "shouldRunCoreMotion",
    "isExplicitReducedMotion",
    "reduceMotionChanged"
  ],
  "motion preference model"
);

mustNot(
  "src/hooks/usePremiumMotion.ts",
  ["buildMotionState(true, false, false)"],
  "must not default to reduced motion"
);

must(
  "src/utils/brandingReanimated.ts",
  [
    "ReduceMotion.Never",
    "BRANDING_REANIMATED_ACTIVE",
    "shouldRunBrandingMotion",
    "brandingWithTiming",
    "brandingWithRepeat"
  ],
  "branding reanimated override"
);

must(
  "src/components/brand/KavyaCinematicSplash.tsx",
  [
    "brandingWithTiming",
    "brandingWithRepeat",
    "isExplicitReducedMotion",
    "preferLight",
    "SPLASH_ABSOLUTE_FAILSAFE_MS",
    "animationFloorDoneRef",
    "logoOpacity.value = 1",
    "minimum_duration_complete"
  ],
  "splash reliability"
);

mustNot(
  "src/components/brand/KavyaCinematicSplash.tsx",
  ["effectiveMotionReady", "motionFallback", "animationStartedRef"],
  "splash must not lock animation on stale prefs"
);

must(
  "src/components/auth/LoginHeroHeader.tsx",
  [
    "shouldRunBrandingMotion",
    "brandingWithRepeat",
    "AppState.addEventListener",
    "CompanyLogo",
    "cancelAnimation(logoScale)",
    "logoScale.value = 1"
  ],
  "login logo reliability"
);

mustNot(
  "src/components/auth/LoginHeroHeader.tsx",
  ["opacity: 0", "scale: 0"],
  "login logo must never hide"
);

must(
  "mobile/components/today/HomeLogoHero.tsx",
  [
    "shouldRunBrandingMotion",
    "brandingWithRepeat",
    "useIsFocused",
    "AppState.addEventListener",
    "showTrack",
    "cancelAnimation(breath)"
  ],
  "today orbit reliability"
);

must(
  "mobile/components/brand/AgriNatureMark.tsx",
  [
    "const angle = animate ? rotation.value + phase : phase",
    "useAnimatedStyle",
    "brandingWithRepeat",
    "cancelAnimation(rotation)"
  ],
  "orbit glyph hooks safety"
);

mustNot(
  "mobile/components/brand/AgriNatureMark.tsx",
  ["if (!animate) {\n    const x = Math.cos(phase)"],
  "orbit glyph must not use conditional hook branches"
);

must(
  "src/components/brand/SplashLogoOrbit.tsx",
  ["reducedMotion", "opacity.value = 1", "brandingWithRepeat"],
  "splash ring reduced fallback"
);

must(
  "src/utils/motionDiagnostics.ts",
  ["__DEV__", "loggedOnce", "Manufacturer", "reduceMotionEnabled", "reanimatedReducedMotion"],
  "motion diagnostics"
);

must("babel.config.js", ['plugins: ["react-native-reanimated/plugin"]'], "babel reanimated plugin");
must("App.tsx", ['import "react-native-reanimated"'], "reanimated side-effect import");

console.log("Motion reliability checks passed.");
