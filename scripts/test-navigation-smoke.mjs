#!/usr/bin/env node
/**
 * Navigation route file presence audit (no TS runtime import).
 * Full module load is covered by `npm run typecheck`.
 * Run: node scripts/test-navigation-smoke.mjs
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ROUTE_FILES = [
  "mobile/app/(tabs)/index.tsx",
  "mobile/app/(tabs)/work.tsx",
  "mobile/app/(tabs)/profile.tsx",
  "mobile/app/tracking.tsx",
  "mobile/app/farmer/[id].tsx",
  "mobile/app/visit/[id].tsx",
  "mobile/app/visit/index.tsx",
  "mobile/app/visit/success.tsx",
  "mobile/app/notifications.tsx",
  "mobile/app/problems.tsx",
  "mobile/app/me/diagnostics.tsx",
  "src/screens/AuthStartScreen.tsx",
  "src/screens/map/MyLocationScreen.tsx",
  "src/screens/map/FarmerMapScreen.tsx",
  "src/screens/OfflineSyncScreen.tsx",
  "src/screens/SyncStatusScreen.tsx",
  "src/screens/SettingsScreen.tsx",
  "src/screens/HelpScreen.tsx",
  "src/navigation/RootNavigator.tsx",
  "src/navigation/VisitFlowNavigator.tsx",
  "src/navigation/rootNavigationRef.ts",
  "src/navigation/navigateVisitFlow.ts",
  "src/navigation/navigateFarmerMap.ts"
];

let missing = 0;
for (const rel of ROUTE_FILES) {
  const abs = resolve(ROOT, rel);
  if (existsSync(abs)) {
    console.log(`✓ ${rel}`);
  } else {
    missing += 1;
    console.error(`✗ missing ${rel}`);
  }
}

if (missing > 0) {
  console.error(`\n${missing} route file(s) missing.`);
  process.exit(1);
}

console.log(`\nAll ${ROUTE_FILES.length} route modules present.`);
