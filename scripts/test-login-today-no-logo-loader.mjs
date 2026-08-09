/**
 * Regression: no Maximum update depth from AppProviders readiness,
 * and Login → Today must not show a full-screen branded logo loader.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("AppProviders onMounted/onCriticalReady fire once via refs", () => {
  const src = read("AppProviders.tsx");
  assert.match(src, /shellReadyFired/);
  assert.match(src, /firedRef/);
  assert.match(src, /onShellReadyRef/);
  assert.match(src, /onCriticalReadyRef/);
  assert.doesNotMatch(src, /}, \[fontsLoaded, fontError, onShellReady\]/);
  assert.doesNotMatch(src, /}, \[fontsReady, isReady, onCriticalReady\]/);
});

test("successful login keeps Login shell — no LoadingState / AppLoadingLogo gate", () => {
  const nav = read("src/navigation/RootNavigator.tsx");
  const auth = read("src/storage/AuthContext.tsx");
  assert.doesNotMatch(nav, /import \{ LoadingState \}/);
  assert.doesNotMatch(nav, /<LoadingState/);
  assert.doesNotMatch(nav, /Loading workday/);
  assert.match(auth, /sessionValidateUi/);
  assert.match(auth, /validateUi: "login"/);
  assert.match(auth, /validateUi: "biometric_lock"/);
  assert.match(nav, /sessionValidateUi === "login"/);
  assert.match(nav, /sessionValidateUi === "biometric_lock"/);
  assert.match(nav, /Enter Today immediately/);
  assert.doesNotMatch(nav, /DeviceSetup/);
  assert.doesNotMatch(nav, /AppLoadingLogo/);
});

test("auth bootstrap establishAuthenticatedSession is single-flight per login", () => {
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /establishAuthenticatedSession/);
  assert.match(auth, /markBootstrapBegin\("establish_session"\)/);
  assert.match(auth, /hydrateDutyFromBootstrap/);
});
