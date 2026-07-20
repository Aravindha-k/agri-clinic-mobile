#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

const app = read("App.tsx");
assert.match(app, /import AppProviders from "\.\/AppProviders"/);
assert.doesNotMatch(app, /import\("\.\/AppProviders"\)/);
assert.doesNotMatch(app, /PROVIDERS_WATCHDOG_MS/);
assert.match(app, /NATIVE_SPLASH_FAILSAFE_MS\s*=\s*STARTUP_TIMEOUTS\.nativeSplashFailsafeMs/);
assert.match(app, /criticalBootstrapMs/);
assert.match(app, /devSlowBootstrapWarnMs/);
assert.match(app, /markStartupBegin/);
assert.match(app, /markAssetsLoaded/);
assert.match(app, /retryBootstrap/);
assert.match(app, /Retry \/ மீண்டும் முயற்சி/);
assert.match(app, /KavyaCinematicSplash/);
assert.match(app, /getStartupErrorCopy/);
assert.match(app, /providers_module_ready/);
assert.match(app, /waiting_for_metro_bundle/);

const coordinator = read("src/bootstrap/startupCoordinator.ts");
assert.match(coordinator, /export const STARTUP_TIMEOUTS/);
assert.match(coordinator, /fontsMs:\s*4000/);
assert.match(coordinator, /secureStoreReadMs:\s*2500/);
assert.match(coordinator, /criticalBootstrapMs:\s*12000/);
assert.match(coordinator, /authLocalMs:\s*6000/);
assert.match(coordinator, /bootstrapNetworkMs:\s*12000/);
assert.match(coordinator, /dutyHydrationMs:\s*8000/);
assert.match(coordinator, /motionPreferenceMs:\s*2000/);
assert.match(coordinator, /hasStartupCompleted/);
assert.match(coordinator, /markStartupBegin/);
assert.match(coordinator, /markFontsLoaded/);
assert.match(coordinator, /markAssetsLoaded/);
assert.match(coordinator, /markAuthRestored/);
assert.match(coordinator, /markBootstrapBegin/);
assert.match(coordinator, /markBootstrapSuccess/);
assert.match(coordinator, /markBootstrapTimeout/);
assert.match(coordinator, /markBootstrapFailed/);
assert.match(coordinator, /markDutyReady/);
assert.match(coordinator, /markStartupComplete/);
assert.match(coordinator, /markStartupFailed/);
assert.match(coordinator, /markContinueOffline/);
assert.match(coordinator, /isStartupContinueOffline/);

const errors = read("src/bootstrap/startupErrors.ts");
assert.match(errors, /network_unreachable/);
assert.match(errors, /providers_import_error/);
assert.match(errors, /auth_bootstrap_error/);
assert.match(errors, /This is not a network problem/);
assert.match(errors, /providers_import_error:[\s\S]*This is not a network problem/);
assert.doesNotMatch(
  errors,
  /providers_import_error:[\s\S]*Check the connection/
);

const providers = read("AppProviders.tsx");
assert.match(providers, /auth_bootstrap_timeout/);
assert.match(providers, /<StartupScreen startupTimedOut/);
assert.match(providers, /fontsLoaded \|\| fontError != null \|\| fontsForced/);
assert.match(providers, /STARTUP_TIMEOUTS\.fontsMs/);
assert.match(providers, /STARTUP_TIMEOUTS\.criticalBootstrapMs/);
assert.match(providers, /markFontsLoaded/);
assert.match(providers, /onContinueOffline/);
assert.match(providers, /markStartupFailed/);
assert.match(providers, /__DEV__/);
assert.match(providers, /waiting_for_metro_bundle/);
assert.match(providers, /onFatalError/);

const auth = read("src/storage/AuthContext.tsx");
const authPhase = read("src/storage/authPhase.ts");

// Auth lifecycle is phase-driven (not the legacy isReady gate).
assert.match(authPhase, /"initializing"/);
assert.match(authPhase, /"locked"/);
assert.match(authPhase, /"authenticating_biometric"/);
assert.match(authPhase, /"validating_session"/);
assert.match(authPhase, /"authenticated"/);
assert.match(authPhase, /"unauthenticated"/);
assert.match(auth, /applyPhase\("initializing"/);
assert.match(auth, /runFastLocalBootstrap/);
assert.match(auth, /foregroundBootstrapPromise/);
assert.match(auth, /if \(foregroundBootstrapPromise\) \{\s*return foregroundBootstrapPromise/);
assert.match(auth, /bootstrapAttemptedRef/);
assert.match(auth, /void runFastLocalBootstrap\(\)/);

// Local bootstrap must finish initializing before background validation may run.
assert.match(
  auth,
  /if \(phase === "locked" \|\| phase === "authenticating_biometric" \|\| phase === "initializing"\) \{\s*return;/
);
assert.match(
  auth,
  /if \(phase !== "authenticated" && phase !== "validating_session"\) \{\s*return;/
);

// Biometric lock path — tokens retained; no network session validation from lock.
assert.match(auth, /lockSessionForBiometric/);
assert.match(auth, /endedPhase = "locked"/);
assert.match(auth, /getAuthPhase\(\) !== "authenticated"/);

// Foreground / reconnect validation only when authenticated (not while locked).
assert.match(
  auth,
  /if \(next === "active" && getAuthPhase\(\) === "authenticated"\) \{\s*void validateSessionInBackground\(\)/
);
assert.match(
  auth,
  /if \(wasOffline && online && getAuthPhase\(\) === "authenticated"\) \{\s*void validateSessionInBackground\(\)/
);

// Hard ceiling: never remain indefinitely in initializing.
assert.match(auth, /STARTUP_TIMEOUTS\.authLocalMs/);
assert.match(auth, /forced_after_timeout/);
assert.match(auth, /applyPhase\("unauthenticated", "forced_after_timeout"\)/);

// Bootstrap failure reaches recoverable unauthenticated (not stuck initializing).
assert.match(auth, /applyPhase\("unauthenticated", "bootstrap_error"\)/);
assert.match(auth, /applyPhase\("unauthenticated", "no saved token"\)/);

// Background validation single-flight + generation staleness.
assert.match(auth, /backgroundValidationPromiseRef/);
assert.match(auth, /const previousValidation = backgroundValidationPromiseRef\.current/);
assert.match(auth, /await previousValidation/);
assert.match(auth, /if \(isStale\(\)\) return/);
assert.doesNotMatch(auth, /backgroundValidationRunningRef/);
assert.match(auth, /setIsAuthenticated\(phase === "authenticated"\)/);
assert.match(auth, /markAuthRestored/);
assert.match(auth, /markBootstrapBegin/);
assert.match(auth, /markBootstrapSuccess/);
assert.match(auth, /markBootstrapTimeout/);
assert.match(auth, /AppState\.addEventListener/);
assert.match(auth, /NetInfo\.addEventListener/);
assert.match(auth, /validateSessionInBackground/);

const duty = read("src/features/duty/store/DutyContext.tsx");
assert.match(duty, /STARTUP_TIMEOUTS\.dutyHydrationMs/);
assert.match(duty, /duty_hydration_timeout/);
assert.match(duty, /markDutyReady/);
assert.match(duty, /refreshDutyMap/);
assert.match(duty, /AppState\.addEventListener/);
assert.match(duty, /NetInfo\.addEventListener/);

const navigator = read("src/navigation/RootNavigator.tsx");
assert.match(navigator, /markStartupComplete/);
assert.match(navigator, /sessionValidateUi/);
assert.doesNotMatch(navigator, /Loading workday/);
assert.doesNotMatch(navigator, /import \{ LoadingState \}/);
assert.doesNotMatch(navigator, /<LoadingState/);
assert.match(navigator, /sessionValidateUi === "login"/);

const recovery = read("src/screens/StartupScreen.tsx");
assert.match(recovery, /markContinueOffline/);
assert.match(recovery, /continueOffline/);
assert.match(recovery, /resetLocalSession/);
assert.match(recovery, /retryBootstrap/);
assert.doesNotMatch(recovery, /\bError\.stack\b|console\.error\(err\)|JSON\.stringify\(err/);
assert.match(recovery, /No stack traces/);

const splash = read("src/components/brand/KavyaCinematicSplash.tsx");
assert.match(splash, /backgroundSettled/);
assert.match(splash, /logoSettled/);
assert.match(splash, /onLoadEnd=\{\(\) => setLogoSettled\(true\)\}/);
assert.match(splash, /cancelAnimation\(screenOpacity\)|exitFinishTimerRef/);
assert.match(splash, /finishSplashOnce/);
assert.match(splash, /splashPreferLightRef/);
assert.match(splash, /splash_mode_locked/);
assert.match(splash, /preferLightLocked/);

const premiumMotion = read("src/hooks/usePremiumMotion.ts");
assert.match(premiumMotion, /buildMotionState\(false, false, false\)/);
assert.match(premiumMotion, /STARTUP_TIMEOUTS\.motionPreferenceMs/);
assert.match(premiumMotion, /withTimeout/);
assert.match(premiumMotion, /shouldRunCoreMotion/);

const biometric = read("src/storage/biometricLoginStorage.ts");
assert.match(biometric, /STARTUP_TIMEOUTS\.biometricLookupMs/);
assert.match(biometric, /BIOMETRIC_PROMPT_MS/);
assert.match(biometric, /withTimeout\([\s\S]*authenticateAsync/);
assert.match(biometric, /cancelLabel:\s*"Cancel"/);

const tokens = read("src/storage/tokenStorage.ts");
assert.match(tokens, /STORE_READ_MS\s*=\s*2500/);
assert.match(tokens, /withTimeout\(SecureStore\.getItemAsync/);

const homeHero = read("mobile/components/today/HomeLogoHero.tsx");
assert.match(homeHero, /useIsFocused\(\)/);
assert.match(homeHero, /AppState\.addEventListener/);
assert.match(homeHero, /return \(\) => subscription\.remove\(\)/);
assert.match(homeHero, /cancelAnimation\(breath\)/);
assert.match(homeHero, /cancelAnimation\(glow\)/);
assert.match(homeHero, /TODAY_LOGO_BREATH_MIN/);
assert.match(homeHero, /TODAY_LOGO_BREATH_MAX/);
assert.match(homeHero, /shouldRunBrandingMotion/);

const sync = read("src/storage/AutomaticSyncProvider.tsx");
assert.match(sync, /app_foreground/);
assert.match(sync, /network_reconnected/);

const i18n = read("src/i18n/en.ts");
assert.match(i18n, /continueOffline:\s*"Continue Offline"/);
assert.match(i18n, /recoveryTitle/);

console.log("Startup recovery and lifecycle hardening checks passed.");
process.exit(0);
