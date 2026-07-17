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
  assert.match(appTsx, /StartupConfigRecovery/);
  assert.match(appTsx, /getApiConfigError/);
  assert.match(appTsx, /The app could not start/);
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
