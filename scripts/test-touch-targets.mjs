#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");
const theme = read("mobile/lib/theme.ts");

assert.match(theme, /touchTargetMin:\s*48/);
assert.match(theme, /minTouchStyle/);

const surfaces = [
  "mobile/components/navigation/MainTabBar.tsx",
  "src/components/ui/VisitFabTabButton.tsx",
  "mobile/app/visit/[id].tsx",
  "mobile/components/work/WorkQueuePanel.tsx",
  "src/screens/SettingsScreen.tsx"
];

for (const file of surfaces) {
  const src = read(file);
  const hasMinTouch =
    /Layout\.touchTargetMin|minTouchStyle|minHeight:\s*48|minWidth:\s*48|height:\s*48|hitSlop/.test(src);
  assert.ok(hasMinTouch, `${file} should declare 48dp targets or hitSlop`);
}

const viewer = read("mobile/app/visit/[id].tsx");
assert.match(viewer, /viewerClose:[\s\S]*height:\s*48/);
assert.match(viewer, /viewerClose:[\s\S]*width:\s*48/);

console.log("Touch-target checks passed.");
