import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

async function read(relativePath) {
  return fs.readFile(path.join(root, relativePath), "utf8");
}

const [
  theme,
  pressableCard,
  mainTabBar,
  stackHeader,
  segmentBar,
  technicalDetails,
  settings,
  english,
  tamil
] = await Promise.all([
  read("mobile/lib/theme.ts"),
  read("mobile/components/ui/PressableCard.tsx"),
  read("mobile/components/navigation/MainTabBar.tsx"),
  read("mobile/components/layout/StackScreenHeader.tsx"),
  read("mobile/components/work/WorkSegmentBar.tsx"),
  read("mobile/components/layout/TechnicalDetailsCollapsible.tsx"),
  read("src/screens/SettingsScreen.tsx"),
  read("src/i18n/en.ts"),
  read("src/i18n/ta.ts")
]);

assert.match(theme, /text4:\s*"#667085"/, "text4 must retain readable contrast");
assert.match(pressableCard, /usePremiumMotion/, "shared card motion must honor reduced motion");
assert.match(pressableCard, /accessibilityRole=.*button/, "pressable cards need a default button role");
assert.match(mainTabBar, /accessibilityRole="tab"/, "tab bar controls need tab semantics");
assert.match(stackHeader, /const BTN = Layout\.touchTargetMin/, "header back control must be at least 48dp");
assert.match(segmentBar, /accessibilityState=\{\{ selected:/, "segments need selected state");
assert.match(segmentBar, /minHeight:\s*48/, "segments must be at least 48dp");
assert.match(technicalDetails, /accessibilityState=\{\{ expanded: open \}\}/, "disclosure needs expanded state");
assert.doesNotMatch(settings, /useTheme|settings\.darkMode|settings\.appearance/, "dark toggle must stay hidden");
assert.match(settings, /accessibilityRole="radio"/, "language choices need radio semantics");

for (const locale of [english, tamil]) {
  for (const key of ["back", "expandSection", "collapseSection"]) {
    assert.match(locale, new RegExp(`\\b${key}:`), `missing shared ${key} translation`);
  }
}

console.log("Shared UI audit passed: contrast, reduced motion, accessibility, settings, and locale keys.");
