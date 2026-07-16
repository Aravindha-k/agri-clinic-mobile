#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

const activeCards = [
  "mobile/components/duty/ActiveWorkDayCard.tsx",
  "mobile/components/duty/DutyStatusCard.tsx",
  "mobile/components/duty/StartWorkDayCard.tsx",
  "mobile/components/duty/WorkdayActionFooter.tsx",
  "src/screens/LoginScreen.tsx",
  "src/screens/StartupScreen.tsx"
];

for (const file of activeCards) {
  const src = read(file);
  assert.doesNotMatch(src, /allowFontScaling=\{\s*false\s*\}/, `${file} must not disable font scaling`);
  // Critical action cards should wrap meta rows / avoid unsafe fixed content heights
  if (file.includes("ActiveWorkDayCard") || file.includes("DutyStatusCard")) {
    assert.match(src, /flexWrap:\s*"wrap"/, `${file} should wrap meta rows for large text / Tamil`);
  }
}

const footer = read("mobile/components/duty/WorkdayActionFooter.tsx");
assert.doesNotMatch(footer, /position:\s*"absolute"/);
assert.match(footer, /useTabBarBottomInset/);

const tracking = read("mobile/app/tracking.tsx");
assert.match(tracking, /tabInset \+ Layout\.scrollBottomExtra/);
assert.doesNotMatch(tracking, /\+ 88/);

const timer = read("mobile/components/duty/DutyTimer.tsx");
assert.doesNotMatch(timer, /allowFontScaling=\{\s*false\s*\}/);

console.log("Large-text layout checks passed.");
