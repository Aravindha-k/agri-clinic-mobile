/**
 * Screen-capture policy: production blocks; training/dev may allow.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

/** Mirrors src/utils/screenCapturePolicy.ts for node --test without TS loader. */
function isScreenCaptureAllowEnv(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function shouldPreventScreenCapture(input) {
  if (input.platform !== "android") return false;
  if (input.isExpoGo) return false;
  if (input.isDev) return false;
  if (isScreenCaptureAllowEnv(input.allowScreenCaptureEnv)) return false;
  return true;
}

test("production Android release keeps FLAG_SECURE protection enabled", () => {
  assert.equal(
    shouldPreventScreenCapture({
      platform: "android",
      isExpoGo: false,
      isDev: false,
      allowScreenCaptureEnv: undefined
    }),
    true
  );
  assert.equal(
    shouldPreventScreenCapture({
      platform: "android",
      isExpoGo: false,
      isDev: false,
      allowScreenCaptureEnv: ""
    }),
    true
  );
  assert.equal(
    shouldPreventScreenCapture({
      platform: "android",
      isExpoGo: false,
      isDev: false,
      allowScreenCaptureEnv: "0"
    }),
    true
  );
});

test("dev and training builds allow screenshots / screen recording", () => {
  assert.equal(
    shouldPreventScreenCapture({
      platform: "android",
      isExpoGo: false,
      isDev: true,
      allowScreenCaptureEnv: undefined
    }),
    false
  );
  assert.equal(
    shouldPreventScreenCapture({
      platform: "android",
      isExpoGo: false,
      isDev: false,
      allowScreenCaptureEnv: "1"
    }),
    false
  );
  assert.equal(
    shouldPreventScreenCapture({
      platform: "android",
      isExpoGo: false,
      isDev: false,
      allowScreenCaptureEnv: "true"
    }),
    false
  );
  assert.equal(
    shouldPreventScreenCapture({
      platform: "android",
      isExpoGo: true,
      isDev: false,
      allowScreenCaptureEnv: undefined
    }),
    false
  );
  assert.equal(
    shouldPreventScreenCapture({
      platform: "ios",
      isExpoGo: false,
      isDev: false,
      allowScreenCaptureEnv: undefined
    }),
    false
  );
});

test("allow-env parser accepts only explicit truthy values", () => {
  assert.equal(isScreenCaptureAllowEnv("1"), true);
  assert.equal(isScreenCaptureAllowEnv("true"), true);
  assert.equal(isScreenCaptureAllowEnv("YES"), true);
  assert.equal(isScreenCaptureAllowEnv("0"), false);
  assert.equal(isScreenCaptureAllowEnv("false"), false);
  assert.equal(isScreenCaptureAllowEnv(undefined), false);
});

test("policy source and hook remain expo-screen-capture + gated FLAG_SECURE", () => {
  const policy = read("src/utils/screenCapturePolicy.ts");
  const hook = read("src/hooks/useSecureScreen.ts");
  assert.match(policy, /EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE/);
  assert.match(policy, /isDev/);
  assert.match(policy, /isExpoGo/);
  assert.doesNotMatch(policy, /process\.env\.EXPO_PUBLIC_QA_MODE/);
  assert.match(hook, /expo-screen-capture/);
  assert.match(hook, /preventScreenCaptureAsync/);
  assert.match(hook, /allowScreenCaptureAsync/);
  assert.match(hook, /shouldPreventScreenCapture/);
  assert.match(hook, /EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE/);
  assert.doesNotMatch(hook, /EXPO_PUBLIC_QA_MODE/);
  assert.match(hook, /InteractionManager\.runAfterInteractions/);
});

test("CI Android APK workflow does not enable training screen-capture override", () => {
  const workflow = read(".github/workflows/android-apk.yml");
  assert.doesNotMatch(workflow, /EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE/);
});

test("TRAINING APK workflow is manual-only and sets allow-screen-capture", () => {
  const training = read(".github/workflows/android-training-apk.yml");
  assert.match(training, /name:\s*Android TRAINING APK/);
  assert.match(training, /workflow_dispatch:/);
  assert.doesNotMatch(training, /on:\s*\n\s*push:/);
  assert.match(training, /EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE:\s*"1"/);
  assert.match(training, /Kavya_Agri_Clinic_TRAINING_/);
  assert.match(training, /npx tsc --noEmit/);
  assert.match(training, /npm run test:hardening/);
});
