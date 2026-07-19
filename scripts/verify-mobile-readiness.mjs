/**
 * Pre-install mobile readiness audit — routes, assets, cross-platform UI patterns.
 * Run: node scripts/verify-mobile-readiness.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const issues = [];
const ok = [];
const warn = [];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}

function pass(msg) {
  ok.push(msg);
}

function fail(msg) {
  issues.push(msg);
}

function note(msg) {
  warn.push(msg);
}

/** Every navigable screen → component file (relative to repo root). */
const SCREEN_MAP = [
  ["Auth / Login", "src/screens/AuthStartScreen.tsx"],
  ["Tab: Today", "mobile/app/(tabs)/index.tsx"],
  ["Tab: Work", "mobile/app/(tabs)/work.tsx"],
  ["Tab: Day / Tracking", "mobile/app/tracking.tsx"],
  ["Tab: Me / Profile", "mobile/app/(tabs)/profile.tsx"],
  ["Work: Farmer detail", "mobile/app/farmer/[id].tsx"],
  ["Work: Visit detail", "mobile/app/visit/[id].tsx"],
  ["Visit flow (4 steps)", "mobile/app/visit/index.tsx"],
  ["Visit success", "mobile/app/visit/success.tsx"],
  ["Problems catalog", "mobile/app/problems.tsx"],
  ["Diagnostics", "mobile/app/me/diagnostics.tsx"],
  ["Settings", "src/screens/SettingsScreen.tsx"],
  ["Help", "src/screens/HelpScreen.tsx"],
  ["Notifications", "mobile/app/notifications.tsx"],
  ["Offline sync", "src/screens/OfflineSyncScreen.tsx"],
  ["My location / Live map / Travel", "src/screens/map/MyLocationScreen.tsx"],
  ["Farmer map", "src/screens/map/FarmerMapScreen.tsx"]
];

const BLUR_FILES = [
  "mobile/components/ui/FieldGlassSurface.tsx",
  "mobile/components/navigation/MainTabBar.tsx",
  "mobile/components/brand/BrandLogoBadge.tsx",
  "mobile/components/today/TodayPlanRow.tsx",
  "mobile/components/workday/WorkdayHero.tsx"
];

const SAFE_AREA_HOOKS = [
  "src/hooks/useTabBarBottomInset.ts",
  "src/hooks/useSafeAreaInsetsCompat.ts",
  "mobile/hooks/useScreenTopEdges.ts"
];

console.log("=== Mobile install readiness audit ===\n");

// 1. Screen files
for (const [label, rel] of SCREEN_MAP) {
  if (exists(rel)) pass(`Screen: ${label}`);
  else fail(`Missing screen file for ${label}: ${rel}`);
}

// 2. BlurView Android fallbacks
for (const rel of BLUR_FILES) {
  const src = read(rel);
  if (!src) {
    fail(`Blur audit: file missing ${rel}`);
    continue;
  }
  if (!src.includes("BlurView")) {
    pass(`Blur skipped (no BlurView): ${rel}`);
    continue;
  }
  const hasGuard =
    src.includes('Platform.OS === "ios"') ||
    src.includes("Platform.OS === 'ios'") ||
    src.includes('Platform.select');
  if (hasGuard) pass(`Blur has iOS guard / Android fallback: ${rel}`);
  else fail(`BlurView without Platform guard: ${rel}`);
}

// 3. Safe area utilities
for (const rel of SAFE_AREA_HOOKS) {
  if (exists(rel)) pass(`Safe area hook: ${rel}`);
  else fail(`Missing safe area hook: ${rel}`);
}

// 4. Notification sounds (Android raw)
for (const sound of ["heat.wav", "water.wav", "water_pour.wav"]) {
  const rel = `android/app/src/main/res/raw/${sound}`;
  if (exists(rel)) pass(`Android notification sound: ${rel}`);
  else note(`Optional Android raw sound missing: ${rel}`);
}

// 5. Key bundled assets
const assets = [
  "assets/brand/logo_circle_transparent.png",
  "assets/brand/app_icon.png",
  "mobile/assets/headers/home.jpg",
  "mobile/assets/headers/work.jpg"
];
for (const rel of assets) {
  if (exists(rel)) pass(`Asset: ${rel}`);
  else fail(`Missing asset: ${rel}`);
}

// 6. TypeScript
console.log("Running typecheck…");
const tsc = spawnSync("npm", ["run", "typecheck"], { cwd: ROOT, shell: true, encoding: "utf8" });
if (tsc.status === 0) pass("TypeScript: tsc --noEmit passed");
else fail(`TypeScript failed:\n${tsc.stdout ?? ""}${tsc.stderr ?? ""}`);

// Report
console.log("\n--- Results ---\n");
for (const m of ok) console.log(`  ✓ ${m}`);
for (const m of warn) console.log(`  ⚠ ${m}`);
for (const m of issues) console.log(`  ✗ ${m}`);

console.log(`\n${ok.length} passed, ${warn.length} warning(s), ${issues.length} issue(s).\n`);

if (issues.length === 0) {
  console.log("--- Manual device smoke test (run on 2+ phones) ---\n");
  const checklist = [
    "Cold install → splash → login → Today tab loads hero + 2×2 stats",
    "Work tab: queue + visits segments, open farmer, open visit detail",
    "FAB (+): visit flow steps 1–4, submit (online + offline queue)",
    "Day tab: workday start/stop, GPS permission prompts",
    "Me tab: profile, problems, diagnostics, settings, help",
    "Notifications screen, offline sync screen",
    "Maps: farmer map, live location (small + large screen)",
    "Rotate denied (portrait lock); keyboard does not hide tab bar",
    "Android: glass surfaces show translucent tint (no crash)",
    "Low-end device: scroll Today + Work without jank"
  ];
  for (const item of checklist) console.log(`  □ ${item}`);
  console.log("");
}

process.exit(issues.length > 0 ? 1 : 0);
