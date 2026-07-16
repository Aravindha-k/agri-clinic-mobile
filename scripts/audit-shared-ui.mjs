import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  assertSemanticMutedReadable,
  contrastRatio,
  extractHexToken
} from "./lib/colorContrast.mjs";

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

/** WCAG AA for normal text — Phase 7E raised muted token for tinted surfaces. */
const MIN_NORMAL_TEXT_CONTRAST = 4.5;

const text4 = extractHexToken(theme, "text4");
const textMutedReadable = extractHexToken(theme, "textMutedReadable");
const placeholder = extractHexToken(theme, "placeholder");
const bg = extractHexToken(theme, "bg");
const surfaceMuted = extractHexToken(theme, "surfaceMuted");
const white = "#FFFFFF";

assert.equal(
  text4,
  textMutedReadable,
  "Colors.text4 and Colors.textMutedReadable must stay aligned"
);
assert.equal(text4, placeholder, "placeholder should use the readable muted token");
assertSemanticMutedReadable(theme);

for (const [label, background] of [
  ["white", white],
  ["Colors.bg", bg],
  ["Colors.surfaceMuted", surfaceMuted]
]) {
  const ratio = contrastRatio(text4, background);
  assert.ok(
    ratio >= MIN_NORMAL_TEXT_CONTRAST,
    `text4 ${text4} on ${label} (${background}) contrast ${ratio.toFixed(2)} must be ≥ ${MIN_NORMAL_TEXT_CONTRAST}`
  );
}

assert.match(pressableCard, /usePremiumMotion/, "shared card motion must honor reduced motion");
assert.match(pressableCard, /accessibilityRole=.*button/, "pressable cards need a default button role");
assert.match(mainTabBar, /accessibilityRole="tab"/, "tab bar controls need tab semantics");
assert.match(stackHeader, /const BTN = Layout\.touchTargetMin/, "header back control must be at least 48dp");
assert.match(segmentBar, /accessibilityState=\{\{ selected:/, "segments need selected state");
assert.match(segmentBar, /minHeight:\s*48/, "segments must be at least 48dp");
assert.match(technicalDetails, /accessibilityState=\{\{ expanded: open \}\}/, "disclosure needs expanded state");

// Light-only V2: informational appearance copy is allowed; functional dark toggle is not.
assert.match(settings, /settings\.lightThemeOnly/, "settings must explain light-only theme");
assert.doesNotMatch(settings, /toggleTheme|setDarkMode\(/, "dark mode APIs must not be wired in Settings");
assert.doesNotMatch(
  settings,
  /settings\.darkMode(?!Hint)/,
  "functional dark-mode toggle label must stay hidden"
);
assert.match(settings, /accessibilityRole="radio"/, "language choices need radio semantics");

for (const locale of [english, tamil]) {
  for (const key of ["back", "expandSection", "collapseSection"]) {
    assert.match(locale, new RegExp(`\\b${key}:`), `missing shared ${key} translation`);
  }
}

console.log(
  `Shared UI audit passed: text4 ${text4} contrast OK on white/bg/surfaceMuted, reduced motion, accessibility, settings, locale keys.`
);
