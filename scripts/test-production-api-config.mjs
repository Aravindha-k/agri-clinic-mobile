/**
 * Hardening tests for production API configuration and CI wiring.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BLOCKED_HOSTS,
  normalizeApiBaseUrl,
  PRODUCTION_API_HOST,
  resolveApiBaseFromEnv,
  validateProductionApiEnv
} from "./lib/apiConfigEnv.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

test("normalizeApiBaseUrl accepts host origin and full /api/v1/ base", () => {
  assert.equal(
    normalizeApiBaseUrl(`http://${PRODUCTION_API_HOST}`),
    `http://${PRODUCTION_API_HOST}/api/v1/`
  );
  assert.equal(
    normalizeApiBaseUrl(`http://${PRODUCTION_API_HOST}/api/v1/`),
    `http://${PRODUCTION_API_HOST}/api/v1/`
  );
});

test("validateProductionApiEnv rejects localhost and missing URL", () => {
  assert.throws(() => validateProductionApiEnv({}), /EXPO_PUBLIC_API_URL|EXPO_PUBLIC_API_BASE_URL/);
  for (const host of BLOCKED_HOSTS) {
    assert.throws(
      () =>
        validateProductionApiEnv({
          EXPO_PUBLIC_API_BASE_URL: `http://${host}/api/v1/`
        }),
      new RegExp(host === "10.0.2.2" ? "10.0.2.2" : host)
    );
  }
});

test("validateProductionApiEnv allows QA HTTP only with explicit insecure flag", () => {
  assert.throws(
    () =>
      validateProductionApiEnv({
        EXPO_PUBLIC_API_BASE_URL: `http://${PRODUCTION_API_HOST}/api/v1/`
      }),
    /HTTPS/
  );

  const allowed = validateProductionApiEnv({
    EXPO_PUBLIC_API_BASE_URL: `http://${PRODUCTION_API_HOST}/api/v1/`,
    EXPO_PUBLIC_ALLOW_INSECURE_HTTP: "1"
  });
  assert.equal(allowed.hostname, PRODUCTION_API_HOST);
  assert.equal(allowed.insecure, true);
});

test("validateProductionApiEnv accepts HTTPS production URL", () => {
  const result = validateProductionApiEnv({
    EXPO_PUBLIC_API_BASE_URL: `https://api.example.com/api/v1/`
  });
  assert.equal(result.hostname, "api.example.com");
  assert.equal(result.insecure, false);
});

test("resolveApiBaseFromEnv prefers EXPO_PUBLIC_API_BASE_URL", () => {
  const base = resolveApiBaseFromEnv({
    EXPO_PUBLIC_API_BASE_URL: `http://${PRODUCTION_API_HOST}/api/v1/`,
    EXPO_PUBLIC_API_URL: "https://ignored.example.com"
  });
  assert.equal(base, `http://${PRODUCTION_API_HOST}/api/v1/`);
});

test("src/api/config.ts uses canonical env + expo extra fallback", () => {
  const configTs = read("src/api/config.ts");
  const apiBase = read("src/api/apiBaseUrl.js");
  assert.match(configTs, /EXPO_PUBLIC_API_BASE_URL|EXPO_PUBLIC_API_URL/);
  assert.match(configTs, /expo-constants/);
  assert.match(configTs, /readExpoExtraApiBase/);
  assert.match(configTs, /if \(!__DEV__\)/);
  assert.match(configTs, /Production APK missing API configuration/);
  assert.match(apiBase, /192\.168\.29\.18/);
  assert.match(apiBase, /13\.207\.17\.117/);
});

test("eas.json release profiles use AWS; development uses LAN", () => {
  const eas = JSON.parse(read("eas.json"));
  assert.match(eas.build.development.env.EXPO_PUBLIC_API_URL, /192\.168\.29\.18/);
  assert.match(eas.build.preview.env.EXPO_PUBLIC_API_URL, /13\.207\.17\.117/);
  assert.match(eas.build.production.env.EXPO_PUBLIC_API_URL, /13\.207\.17\.117/);
  assert.match(eas.build["production-apk"].env.EXPO_PUBLIC_API_URL, /13\.207\.17\.117/);
});

test("GitHub workflow injects EXPO_PUBLIC_API_BASE_URL before assembleRelease", () => {
  const workflow = read(".github/workflows/android-apk.yml");
  assert.match(workflow, /EXPO_PUBLIC_API_BASE_URL/);
  assert.match(workflow, /validate-production-api-env/);
  assert.match(workflow, /verify-production-api-health/);
  assert.match(workflow, /assembleRelease/);
});

test("audit scripts exist for release API configuration", () => {
  for (const rel of [
    "scripts/validate-production-api-env.mjs",
    "scripts/verify-production-api-health.mjs",
    "scripts/verify-expo-public-config.mjs"
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
  }
});
