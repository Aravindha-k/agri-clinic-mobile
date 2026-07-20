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
    'Platform.OS === "android"',
    "brandingWithTiming",
    "brandingWithRepeat",
    "BRANDING_REPEAT_NOOP",
    'typeof callback === "function"',
    "return withTiming(toValue, finalConfig);",
    "withRepeat(animation, numberOfReps, reverse, safeCallback, BRANDING_REANIMATED_ACTIVE)"
  ],
  "branding reanimated override"
);

mustNot(
  "src/utils/brandingReanimated.ts",
  [
    "withRepeat(animation, numberOfReps, reverse, callback, BRANDING_REANIMATED_ACTIVE)",
    "withTiming(toValue, { ...config, reduceMotion: BRANDING_REANIMATED_ACTIVE }, callback)",
    "return withRepeat(animation, numberOfReps, reverse);"
  ],
  "must not pass undefined callback or omit Never on withRepeat"
);

must(
  "src/components/brand/KavyaCinematicSplash.tsx",
  [
    "lockSplashPreferLight",
    "splashPreferLightRef",
    "splash_mode_locked",
    "animationStartedRef",
    "finishSplashOnce",
    "exitFinishTimerRef",
    "SPLASH_EXIT_FINISH_FALLBACK_MS",
    '"worklet"',
    "runOnJS(finishSplashOnce)",
    "brandingWithTiming",
    "brandingWithRepeat",
    "SPLASH_ABSOLUTE_FAILSAFE_MS",
    "animationFloorDoneRef",
    "logoOpacity.value = 1",
    "minimum_duration_complete",
    "if (exitStartedRef.current) return"
  ],
  "splash reliability"
);

mustNot(
  "src/components/brand/KavyaCinematicSplash.tsx",
  [
    "effectiveMotionReady",
    "motionFallback",
    "animationStartedRef.current = false",
    "preferLight, bgScale",
    "motion.ready, preferLight"
  ],
  "splash must not remount on motion preference changes"
);

must(
  "src/components/brand/SplashLogoOrbit.tsx",
  [
    "reducedMotionLockedRef",
    "animationStartedRef",
    "reducedMotion",
    "opacity.value = 1",
    "brandingWithRepeat"
  ],
  "splash ring mode lock"
);

mustNot(
  "src/components/brand/SplashLogoOrbit.tsx",
  ["[active, left, opacity, reducedMotion, rotation"],
  "orbit must not restart when reducedMotion prop changes"
);

must(
  "src/components/auth/LoginHeroHeader.tsx",
  [
    "shouldRunBrandingMotion",
    "brandingWithRepeat",
    "AppState.addEventListener",
    "CompanyLogo",
    "cancelAnimation(logoScale)",
    "logoScale.value = 1",
    "Reanimated.View",
    "[logoScale, shouldAnimate]"
  ],
  "login logo reliability"
);

mustNot(
  "src/components/auth/LoginHeroHeader.tsx",
  ["opacity: 0", "scale: 0", "motion.preference, motion.ready"],
  "login logo must never hide or remount on preference flips"
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
  "src/notifications/expoNotificationsAccess.ts",
  [
    "isExpoGo",
    "loadExpoNotifications",
    "warnExpoGoNotificationsOnce",
    'import("expo-notifications")'
  ],
  "expo go notification guard"
);

mustNot(
  "src/notifications/fieldReminderNotifications.ts",
  ['import * as Notifications from "expo-notifications"'],
  "field reminders must lazy-load notifications"
);

mustNot(
  "src/features/fieldTrackingSetup/probe.ts",
  ['import * as Notifications from "expo-notifications"'],
  "field tracking probe must lazy-load notifications"
);

must(
  "src/utils/motionDiagnostics.ts",
  ["__DEV__", "loggedOnce", "Manufacturer", "reduceMotionEnabled", "reanimatedReducedMotion"],
  "motion diagnostics"
);

must("babel.config.js", ['plugins: ["react-native-reanimated/plugin"]'], "babel reanimated plugin");
must("App.tsx", ['import "react-native-reanimated"'], "reanimated side-effect import");

console.log("Motion reliability checks passed.");
