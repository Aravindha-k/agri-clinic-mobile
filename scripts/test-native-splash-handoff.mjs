import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nativeSplash = readFileSync(new URL("../src/bootstrap/nativeSplash.ts", import.meta.url), "utf8");
const ensure = readFileSync(new URL("../scripts/ensure-android-release-config.mjs", import.meta.url), "utf8");
const genLogo = readFileSync(new URL("../scripts/generate-splash-logo.mjs", import.meta.url), "utf8");
const splashColors = readFileSync(new URL("../src/components/brand/splashColors.ts", import.meta.url), "utf8");
const cinematic = readFileSync(new URL("../src/components/brand/KavyaCinematicSplash.tsx", import.meta.url), "utf8");

test("OS splash exit fade is disabled before hideAsync", () => {
  const hideFn = nativeSplash.slice(nativeSplash.indexOf("hideNativeSplashSafe"));
  const setOpts = hideFn.indexOf("setOptions({ duration: 0 })");
  const hideAsync = hideFn.indexOf("hideAsync()");
  assert.ok(setOpts > -1, "setOptions({ duration: 0 }) must be called");
  assert.ok(hideAsync > setOpts, "setOptions must run before hideAsync");
});

test("native splash is held until release and hide is idempotent", () => {
  assert.ok(nativeSplash.includes("preventAutoHideAsync"));
  assert.ok(nativeSplash.includes("if (hideRequested)"), "hide must stay idempotent");
});

test("handoff delay keeps native splash until cinematic assets settle", () => {
  assert.match(splashColors, /SPLASH_NATIVE_HANDOFF_MS = \d+/, "handoff constant must remain");
  assert.ok(
    cinematic.includes("backgroundSettled") && cinematic.includes("logoSettled"),
    "release must wait for cinematic bg+logo (prevents blank/black frame)"
  );
});

test("generated theme disables the OS splash icon-spin animation", () => {
  assert.ok(ensure.includes("windowSplashScreenAnimationDuration\">0"));
});

test("native launch screen keeps the KAC circular logo + brand background", () => {
  assert.ok(ensure.includes("windowSplashScreenAnimatedIcon\">@drawable/splashscreen_icon"));
  assert.ok(ensure.includes("windowSplashScreenIconBackgroundColor\">@color/splashscreen_background"));
  assert.ok(ensure.includes("NATIVE_LAUNCH_BG"), "background stays brand sky-blue (no white flash)");
});

test("launch logo is contain-fit and circle-masked (no edge crop)", () => {
  assert.ok(genLogo.includes('fit: "contain"'), "logo must be contain-fit");
  assert.ok(genLogo.includes('blend: "dest-in"'), "logo must be circle-masked");
  assert.ok(genLogo.includes("alpha: 0"), "corners must stay transparent");
});
