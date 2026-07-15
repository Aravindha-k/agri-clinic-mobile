#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

const app = read("App.tsx");
assert.match(app, /PROVIDERS_WATCHDOG_MS\s*=\s*5500/);
assert.match(app, /retryProviderLoad/);
assert.match(app, /Retry \/ மீண்டும் முயற்சி/);

const providers = read("AppProviders.tsx");
assert.match(providers, /auth_bootstrap_timeout/);
assert.match(providers, /<StartupScreen startupTimedOut \/>/);
assert.match(providers, /fontsLoaded \|\| fontError != null/);

const auth = read("src/storage/AuthContext.tsx");
assert.match(auth, /if \(!isReady\) \{\s*await runFastLocalBootstrap\(\)/);
assert.match(auth, /backgroundValidationPromiseRef/);
assert.match(auth, /const previousValidation = backgroundValidationPromiseRef\.current/);
assert.match(auth, /await previousValidation/);
assert.match(auth, /if \(isStale\(\)\) return/);
assert.doesNotMatch(auth, /backgroundValidationRunningRef/);

const splash = read("src/components/brand/KavyaCinematicSplash.tsx");
assert.match(splash, /backgroundSettled/);
assert.match(splash, /logoSettled/);
assert.match(splash, /onLoadEnd=\{\(\) => setLogoSettled\(true\)\}/);
assert.match(splash, /cancelAnimation\(screenOpacity\)/);
assert.match(splash, /const maxVisibleTimer = setTimeout/);

const premiumMotion = read("src/hooks/usePremiumMotion.ts");
assert.match(premiumMotion, /buildMotionState\(true, false, false\)/);

const homeHero = read("mobile/components/today/HomeLogoHero.tsx");
assert.match(homeHero, /useIsFocused\(\)/);
assert.match(homeHero, /AppState\.addEventListener/);
assert.match(homeHero, /return \(\) => subscription\.remove\(\)/);
assert.match(homeHero, /cancelAnimation\(zoom\)/);
assert.match(homeHero, /cancelAnimation\(drift\)/);

console.log("Startup recovery and motion readiness checks passed.");
process.exit(0);
