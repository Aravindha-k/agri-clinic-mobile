#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

const app = read("App.tsx");
assert.match(app, /PROVIDERS_WATCHDOG_MS\s*=\s*STARTUP_TIMEOUTS\.providersModuleMs/);
assert.match(app, /NATIVE_SPLASH_FAILSAFE_MS\s*=\s*STARTUP_TIMEOUTS\.nativeSplashFailsafeMs/);
assert.match(app, /markStartupBegin/);
assert.match(app, /markAssetsLoaded/);
assert.match(app, /retryProviderLoad/);
assert.match(app, /Retry \/ மீண்டும் முயற்சி/);
assert.match(app, /KavyaCinematicSplash/);

const coordinator = read("src/bootstrap/startupCoordinator.ts");
assert.match(coordinator, /export const STARTUP_TIMEOUTS/);
assert.match(coordinator, /fontsMs:\s*4000/);
assert.match(coordinator, /secureStoreReadMs:\s*2500/);
assert.match(coordinator, /providersModuleMs:\s*5500/);
assert.match(coordinator, /authLocalMs:\s*6000/);
assert.match(coordinator, /bootstrapNetworkMs:\s*12000/);
assert.match(coordinator, /dutyHydrationMs:\s*8000/);
assert.match(coordinator, /motionPreferenceMs:\s*2000/);
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

const providers = read("AppProviders.tsx");
assert.match(providers, /auth_bootstrap_timeout/);
assert.match(providers, /<StartupScreen startupTimedOut/);
assert.match(providers, /fontsLoaded \|\| fontError != null \|\| fontsForced/);
assert.match(providers, /STARTUP_TIMEOUTS\.fontsMs/);
assert.match(providers, /markFontsLoaded/);
assert.match(providers, /onContinueOffline/);
assert.match(providers, /markStartupFailed/);

const auth = read("src/storage/AuthContext.tsx");
assert.match(auth, /if \(!isReady\) \{\s*await runFastLocalBootstrap\(\)/);
assert.match(auth, /backgroundValidationPromiseRef/);
assert.match(auth, /const previousValidation = backgroundValidationPromiseRef\.current/);
assert.match(auth, /await previousValidation/);
assert.match(auth, /if \(isStale\(\)\) return/);
assert.doesNotMatch(auth, /backgroundValidationRunningRef/);
assert.match(auth, /setIsAuthenticated\(true\)/);
assert.match(auth, /markAuthRestored/);
assert.match(auth, /markBootstrapBegin/);
assert.match(auth, /markBootstrapSuccess/);
assert.match(auth, /markBootstrapTimeout/);
assert.match(auth, /STARTUP_TIMEOUTS\.authLocalMs/);
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
assert.match(navigator, /isStartupContinueOffline\(\)/);
assert.match(navigator, /markStartupComplete/);
assert.match(navigator, /Loading workday/);

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
assert.match(splash, /cancelAnimation\(screenOpacity\)/);
assert.match(splash, /const maxVisibleTimer = setTimeout/);
assert.match(splash, /usePremiumMotion/);
assert.match(splash, /preferLight/);
assert.match(splash, /if \(preferLight\)/);

const premiumMotion = read("src/hooks/usePremiumMotion.ts");
assert.match(premiumMotion, /buildMotionState\(true, false, false\)/);
assert.match(premiumMotion, /STARTUP_TIMEOUTS\.motionPreferenceMs/);
assert.match(premiumMotion, /withTimeout/);

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
assert.match(homeHero, /cancelAnimation\(zoom\)/);
assert.match(homeHero, /cancelAnimation\(drift\)/);

const sync = read("src/storage/AutomaticSyncProvider.tsx");
assert.match(sync, /app_foreground/);
assert.match(sync, /network_reconnected/);

const i18n = read("src/i18n/en.ts");
assert.match(i18n, /continueOffline:\s*"Continue Offline"/);
assert.match(i18n, /recoveryTitle/);

console.log("Startup recovery and lifecycle hardening checks passed.");
process.exit(0);
