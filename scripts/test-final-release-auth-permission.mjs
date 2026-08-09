/**
 * Final release: splash color, KAC- login, logout biometric policy, permission Settings class.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const MOBILE_LOGIN_PREFIX = "KAC-";

function normalizeMobileLoginSuffix(raw) {
  let value = String(raw ?? "")
    .trim()
    .toUpperCase();
  while (value.startsWith(MOBILE_LOGIN_PREFIX)) {
    value = value.slice(MOBILE_LOGIN_PREFIX.length).trim();
  }
  value = value.replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-");
  if (isLegacyEmployeeIdIdentifier(value)) {
    return value;
  }
  return value.replace(/[^A-Z0-9]/g, "");
}

function toMobileLoginIdentifier(suffixOrFull) {
  const suffix = normalizeMobileLoginSuffix(suffixOrFull);
  if (!suffix) return "";
  if (isLegacyEmployeeIdIdentifier(suffix)) {
    return suffix;
  }
  return `${MOBILE_LOGIN_PREFIX}${suffix}`;
}

function isLegacyEmployeeIdIdentifier(identifier) {
  return /^[A-Za-z]+-\d+$/i.test(String(identifier ?? "").trim());
}

test("1–3. Native splash background is sky #D8ECF8; colorPrimaryDark does not flash green", () => {
  const colors = read("android/app/src/main/res/values/colors.xml");
  assert.match(colors, /splashscreen_background">#D8ECF8</);
  assert.match(colors, /colorPrimaryDark">#D8ECF8</);
  assert.doesNotMatch(colors, /colorPrimaryDark">#004D17</);
  assert.doesNotMatch(colors, /splashscreen_background">#0B3D2E</);

  const brand = read("src/config/brand.config.js");
  assert.match(brand, /nativeSplashBackgroundColor:\s*"#D8ECF8"/);

  const ensure = read("scripts/ensure-android-release-config.mjs");
  assert.match(ensure, /colorPrimaryDark/);
  assert.match(ensure, /NATIVE_LAUNCH_BG/);

  const splashColors = read("src/components/brand/splashColors.ts");
  assert.match(splashColors, /#D8ECF8/);

  const app = read("App.tsx");
  assert.match(app, /NATIVE_LAUNCH_BG/);
  assert.match(app, /KavyaCinematicSplash/);
  // Recovery CTA may use brand green; splash root/overlay must stay sky.
  assert.match(app, /splashOverlay[\s\S]*backgroundColor:\s*NATIVE_LAUNCH_BG/);
  assert.doesNotMatch(
    app.slice(0, app.indexOf("retryButton")),
    /backgroundColor:\s*["']#0F6B43["']/
  );
  assert.doesNotMatch(app, /backgroundColor:\s*["']#004D17["']/);
});

test("4–7. KAC- username normalization and Login wiring", () => {
  assert.equal(toMobileLoginIdentifier("aravindh01"), "KAC-ARAVINDH01");
  assert.equal(toMobileLoginIdentifier("ARAVINDH01"), "KAC-ARAVINDH01");
  assert.equal(toMobileLoginIdentifier("KAC-ARAVINDH01"), "KAC-ARAVINDH01");
  assert.equal(toMobileLoginIdentifier("kac-aravindh01"), "KAC-ARAVINDH01");
  assert.equal(toMobileLoginIdentifier("KAC-KAC-ARAVINDH01"), "KAC-ARAVINDH01");
  assert.equal(normalizeMobileLoginSuffix(" ara vindh "), "ARAVINDH");
  assert.equal(toMobileLoginIdentifier("AG-8821"), "AG-8821");
  assert.equal(toMobileLoginIdentifier("ag-8821"), "AG-8821");
  assert.equal(isLegacyEmployeeIdIdentifier("AG-8821"), true);
  assert.equal(isLegacyEmployeeIdIdentifier("KAC-ARAVINDH01"), false);

  const util = read("src/utils/mobileLoginUsername.ts");
  assert.match(util, /MOBILE_LOGIN_PREFIX/);
  assert.match(util, /normalizeMobileLoginSuffix/);
  assert.match(util, /toMobileLoginIdentifier/);
  assert.match(util, /isLegacyEmployeeIdIdentifier/);

  const login = read("src/screens/LoginScreen.tsx");
  assert.match(login, /prefixText=\{/);
  assert.match(login, /MOBILE_LOGIN_PREFIX/);
  assert.match(login, /normalizeMobileLoginSuffix/);
  assert.match(login, /toMobileLoginIdentifier\(empId\)/);
  assert.match(login, /isLegacyEmployeeIdIdentifier/);

  const authApi = read("src/api/auth.ts");
  assert.match(authApi, /isLegacyEmployeeIdIdentifier/);
  assert.match(authApi, /username:\s*trimmed/);
  assert.match(authApi, /employee_id:\s*trimmed/);
});

test("8–13. Foreground permission requests only from canonical helper; Settings is recovery", () => {
  const fg = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");
  assert.match(fg, /requestForegroundPermissionsAsync/);
  assert.match(fg, /isPermanentlyDenied/);
  assert.match(fg, /Location permission is disabled for Kavya Agri Clinic/);
  assert.doesNotMatch(fg, /Linking\.openSettings/);
  assert.doesNotMatch(fg, /openSettings/);

  // Only ensureForeground/Background own request* APIs for location.
  const srcTree = ["src", "mobile"].flatMap((dir) => {
    const walk = (d, acc = []) => {
      for (const name of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
        const rel = path.join(d, name.name);
        if (name.isDirectory()) {
          if (name.name === "node_modules" || name.name === "build-artifacts") continue;
          walk(rel, acc);
        } else if (/\.(ts|tsx)$/.test(name.name)) acc.push(rel);
      }
      return acc;
    };
    return walk(dir);
  });

  const requestSites = [];
  for (const rel of srcTree) {
    const body = read(rel);
    if (body.includes("requestForegroundPermissionsAsync")) requestSites.push(rel);
  }
  assert.deepEqual(
    requestSites.filter((p) => !p.includes("ensureForegroundLocation")),
    [],
    `unexpected foreground request sites: ${requestSites.join(", ")}`
  );

  const compliance = read("src/storage/GpsComplianceContext.tsx");
  assert.match(compliance, /ensureForegroundLocationPermission/);
  assert.match(compliance, /permanentlyDenied/);
});

test("14–15. GPS service-off path does not re-request permission", () => {
  const fg = read("src/features/fieldTrackingSetup/ensureForegroundLocation.ts");
  assert.match(fg, /servicesDisabled/);
  assert.match(fg, /SERVICES_OFF_MESSAGE/);
  assert.match(fg, /ensureAndroidLocationServicesEnabled/);
});

test("16–20. Work Day non-blocking + permission probeOnly preserved", () => {
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(duty, /probeOnly:\s*true/);
  assert.match(duty, /void \(async \(\) => \{/);
  assert.match(duty, /confirmDutyStartLocationOrRetry/);
  assert.match(duty, /return started;/);

  const tracking = read("src/storage/TrackingContext.tsx");
  assert.match(tracking, /CURRENT_FIX_TIMEOUT_MS/);
  assert.match(tracking, /void pollOnce\(\)/);
});

test("21–23. Visit/Day use shared gate; Day FLAG_SECURE", () => {
  const visitGps = read("src/utils/locationRequiredModal.ts");
  assert.match(visitGps, /ensureLocationReadyForAction/);
  assert.doesNotMatch(visitGps, /requestForegroundPermissionsAsync/);

  const day = read("mobile/app/tracking.tsx");
  assert.match(day, /useSecureScreen/);
});

test("24–27. Biometric cold-start locked gate; no false session-timeout", () => {
  const auth = read("src/storage/AuthContext.tsx");
  assert.match(auth, /lockSessionForBiometric/);
  assert.match(auth, /withoutSessionExpiredTeardown|refresh_failed_reauth_available|getRefreshToken/);
  const boot = auth.slice(auth.indexOf("runFastLocalBootstrap"), auth.indexOf("bootstrapAttemptedRef"));
  assert.doesNotMatch(boot, /setLoginNotice\(SESSION_EXPIRED_MESSAGE\)/);
});

test("28–30. Explicit logout requires password; preference kept", () => {
  const auth = read("src/storage/AuthContext.tsx");
  const signOut = auth.slice(auth.indexOf("const signOut = useCallback"), auth.indexOf("const value = useMemo"));
  assert.match(signOut, /clearBiometricReauthMaterial\("explicit_logout"\)/);
  assert.doesNotMatch(signOut, /clearBiometricLogin/);
  assert.match(signOut, /setPreferPasswordLoginThisSession\(true\)/);
  assert.match(auth, /saveBiometricReauthMaterial/);
  assert.match(auth, /biometric_reconnected/);
});

test("31–32. First image + farmer optimistic photo preserved", () => {
  const detail = read("mobile/lib/visitDetailApi.ts");
  assert.match(detail, /mergeVisitAttachmentsById|createdImage/);
  const avatar = read("mobile/components/farmers/FarmerPhotoAvatar.tsx");
  assert.match(avatar, /setLocalUrl\(picked\.uri\)/);
});

test("Background location remains optional soft path for FGS", () => {
  const gate = read("src/features/fieldTrackingSetup/locationReadinessGate.ts");
  assert.match(gate, /ensureBackgroundLocation|Background/);
  // Declining BG still allows start — FGS uses FG permission.
  assert.match(gate, /Declining BG|still allows|FGS|foreground/i);
});
