#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertSemanticMutedReadable,
  contrastRatio,
  extractHexToken
} from "./lib/colorContrast.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

assert.ok(existsSync(resolve(root, "docs/MOBILE_V2_ACTIVE_SURFACES.md")));
const docs = read("docs/MOBILE_V2_ACTIVE_SURFACES.md");
assert.match(docs, /light-theme only/i);
assert.match(docs, /@legacy-mobile-screen/);

const themeCtx = read("src/theme/ThemeContext.tsx");
assert.match(themeCtx, /light-theme only|lightOnly/i);
assert.match(themeCtx, /isDark:\s*false/);
assert.doesNotMatch(themeCtx, /useColorScheme/);

const settings = read("src/screens/SettingsScreen.tsx");
assert.match(settings, /settings\.lightThemeOnly/);
assert.match(settings, /settings\.lightThemeOnlyHint/);
assert.doesNotMatch(settings, /toggleTheme|setDarkMode\(/);

const colors = read("mobile/lib/theme.ts");
const text4 = extractHexToken(colors, "text4");
const muted = extractHexToken(colors, "textMutedReadable");
assert.equal(text4, muted, "text4 and textMutedReadable must match");
assertSemanticMutedReadable(colors);
assert.ok(contrastRatio(text4, "#FFFFFF") >= 4.5, "muted readable text must meet AA on white");
assert.ok(contrastRatio(text4, extractHexToken(colors, "bg")) >= 4.5);
assert.ok(contrastRatio(text4, extractHexToken(colors, "surfaceMuted")) >= 4.5);

console.log("Theme safety checks passed.");
