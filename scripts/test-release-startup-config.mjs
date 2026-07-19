/**
 * Release startup must not throw during config module import.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

test("src/api/config.ts resolves release config without throwing at import", () => {
  const configTs = read("src/api/config.ts");
  assert.match(configTs, /resolveApiConfig\(/);
  assert.match(configTs, /export const API_CONFIG_ERROR/);
  assert.match(configTs, /export const API_BASE_URL = _resolvedConfig\.ok/);
  assert.doesNotMatch(configTs, /function resolveApiBaseUrl\(\): string/);
  assert.doesNotMatch(configTs, /throw new Error\([\s\S]*Production APK missing API configuration/);
});

test("App.tsx renders configuration recovery instead of crashing", () => {
  const appTsx = read("App.tsx");
  const errors = read("src/bootstrap/startupErrors.ts");

  // Categorized multilingual copy lives in startupErrors — not hardcoded in App.tsx.
  assert.match(errors, /export type StartupErrorCategory/);
  assert.match(errors, /configuration_error/);
  assert.match(errors, /export function getStartupErrorCopy/);
  assert.match(errors, /messageTa:/);
  assert.match(errors, /configuration_error:\s*\{[\s\S]*?title:[\s\S]*?message:[\s\S]*?messageTa:/);
  assert.doesNotMatch(appTsx, /The app could not start/);

  // Config recovery UI: localized copy + build diagnostics + optional error code.
  assert.match(appTsx, /function StartupConfigRecovery/);
  assert.match(appTsx, /getStartupErrorCopy\("configuration_error"\)/);
  assert.match(appTsx, /getApiBuildDiagnostics\(\)/);
  assert.match(appTsx, /getApiConfigError\(\)/);
  assert.match(appTsx, /\{copy\.title\}/);
  assert.match(appTsx, /\{copy\.message\}/);
  assert.match(appTsx, /\{copy\.messageTa\}/);
  assert.match(appTsx, /diag\.appVersion/);
  assert.match(appTsx, /diag\.gitCommit/);
  assert.match(appTsx, /configError \? `\\n\$\{configError\.code\}`/);

  // Configuration errors never crash — early recovery branch before providers mount.
  assert.match(appTsx, /const startupConfigError = getApiConfigError\(\)/);
  assert.match(
    appTsx,
    /if \(startupConfigError\) \{\s*return \([\s\S]*?<StartupConfigRecovery \/>/
  );

  // Categorized failure recovery retains bilingual copy + retry where applicable.
  assert.match(appTsx, /function StartupFailureRecovery/);
  assert.match(appTsx, /getStartupErrorCopy\(category\)/);
  assert.match(appTsx, /onRetry=\{retryBootstrap\}/);
  assert.match(appTsx, /Retry \/ மீண்டும் முயற்சி/);
  assert.match(appTsx, /<StartupFailureRecovery category=\{bootError\} onRetry=\{retryBootstrap\} \/>/);
});


test("api client maps missing config to CONFIG_ERROR request error", () => {
  const clientTs = read("src/api/client.ts");
  assert.match(clientTs, /hasValidApiConfig/);
  assert.match(clientTs, /CONFIG_ERROR/);
});

test("GitHub workflow names APK artifacts with version, SHA, and run number", () => {
  const workflow = read(".github/workflows/android-apk.yml");
  assert.match(workflow, /GITHUB_SHA/);
  assert.match(workflow, /GITHUB_RUN_NUMBER/);
  assert.match(workflow, /Kavya_Agri_Clinic_QA_/);
});

test("babel config includes Reanimated plugin last", () => {
  const babel = read("babel.config.js");
  assert.match(babel, /react-native-reanimated\/plugin/);
});

test("release profiles never enable Expo development client / Metro loader", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(!pkg.dependencies?.["expo-dev-client"], "expo-dev-client must not be a runtime dependency");
  assert.ok(!pkg.devDependencies?.["expo-dev-client"], "expo-dev-client must not be installed");

  const eas = JSON.parse(read("eas.json"));
  for (const profile of ["preview", "production", "production-apk", "production-aab"]) {
    const cfg = eas.build?.[profile];
    assert.ok(cfg, `eas build profile ${profile} must exist`);
    assert.notEqual(cfg.developmentClient, true, `${profile} must not set developmentClient: true`);
  }

  const styles = read("android/app/src/main/res/values/styles.xml");
  assert.doesNotMatch(styles, /icon_preferred/, "splash must not fall back to launcher icon plate");

  const ensure = read("scripts/ensure-android-release-config.mjs");
  assert.doesNotMatch(ensure, /icon_preferred/, "CI release config must not inject icon_preferred");
});
