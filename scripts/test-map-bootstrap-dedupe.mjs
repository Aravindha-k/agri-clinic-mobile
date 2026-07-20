/**
 * Deduped Day-map / bootstrap / logout / production map-log contracts.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("duty map API is single-flight and freshness-aware", () => {
  const src = read("src/features/duty/api/dutyMapApi.ts");
  assert.match(src, /mapFlights/);
  assert.match(src, /MAP_FRESH_MS\s*=\s*20_000/);
  assert.match(src, /options\?: \{ force\?: boolean \}/);
  assert.match(src, /if \(!options\?\.force\)/);
  assert.match(src, /mapFlights\.get\(dutyId\)/);
  assert.doesNotMatch(src, /dedupe:\s*false/);
});

test("force refresh bypasses map freshness via options.force", () => {
  const api = read("src/features/duty/api/dutyMapApi.ts");
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(api, /force\?: boolean/);
  assert.match(duty, /fetchDutyMap\(duty\.duty_session_id, \{ force: options\?\.force === true \}\)/);
  assert.match(duty, /refreshDutyMap\(\{ force: true \}\)/);
});

test("mobile bootstrap is single-flight with freshness window", () => {
  const src = read("src/features/duty/api/mobileBootstrapApi.ts");
  assert.match(src, /MOBILE_BOOTSTRAP_FRESH_MS\s*=\s*45_000/);
  assert.match(src, /bootstrapFlight/);
  assert.match(src, /invalidateMobileBootstrapCache/);
  assert.match(src, /force\?: boolean/);
  assert.match(src, /if \(!options\?\.force && lastBootstrap/);
  assert.doesNotMatch(src, /dedupe:\s*false/);
});

test("DutyContext preserves map during compact bootstrap / refresh", () => {
  const src = read("src/features/duty/store/DutyContext.tsx");
  assert.match(src, /authoritativeEmptyMap/);
  assert.match(src, /mapHasMarkers/);
  assert.match(src, /sameSessionMap/);
  assert.match(src, /refreshing-with-existing-data/);
  assert.match(src, /mapPromiseRef/);
  assert.match(src, /refreshBootstrap\(\{ force: false \}\)/);
  assert.match(src, /refreshDutyMap\(\{ force: true \}\)/);
  // Compact null preserves same-session markers.
  assert.match(src, /sameSessionMap\(prevMap, reconciled\.duty_session_id\) && mapHasMarkers\(prevMap\)/);
  // Authoritative empty clears markers.
  assert.match(src, /authoritativeEmptyMap: true/);
  // AppState must not chain refreshCurrentDuty + refreshDutyMap (duplicate storm).
  assert.doesNotMatch(
    src,
    /AppState\.addEventListener[\s\S]*refreshCurrentDuty\(\)[\s\S]*refreshDutyMap/
  );
});

test("app resume causes at most one bootstrap reconciliation", () => {
  const duty = read("src/features/duty/store/DutyContext.tsx");
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(duty, /refreshBootstrap\(\{ force: false \}\)/);
  assert.match(auth, /fetchMobileBootstrap\(\{ force: false \}\)/);
  assert.match(auth, /fetchMobileBootstrap\(\{ force: true \}\)/);
});

test("logout is single-flight and tolerates 429", () => {
  const auth = read("src/api/auth.ts");
  const ctx = read("src/storage/AuthContext.tsx");
  assert.match(auth, /logoutFlight/);
  assert.match(auth, /status === 429/);
  assert.match(auth, /status === 401/);
  assert.match(auth, /status === 403/);
  assert.match(ctx, /signOutInFlightRef/);
  assert.match(ctx, /if \(signOutInFlightRef\.current\)/);
});

test("production suppresses verbose map diagnostics", () => {
  const src = read("src/utils/mapDebug.ts");
  assert.match(src, /mapDiagnosticsEnabled/);
  assert.match(src, /__DEV__/);
  assert.match(src, /if \(!mapDiagnosticsEnabled\(\)\) return/);
  const client = read("src/api/client.ts");
  assert.match(client, /__DEV__/);
});

test("visit submit uses one canonical map refresh path", () => {
  const src = read("mobile/lib/visit/visitSubmitCoordinator.ts");
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(src, /emitVisitDataRefresh/);
  assert.doesNotMatch(
    src,
    /Promise\.all\(\[\s*refreshCurrentDuty\(\)[\s\S]*refreshDutyMap\(\)/
  );
  assert.match(duty, /subscribeVisitDataRefresh[\s\S]*refreshDutyMap\(\{ force: true \}/);
});
