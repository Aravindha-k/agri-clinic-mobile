#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

assert.ok(existsSync(resolve(root, "docs/MOBILE_V2_ACTIVE_SURFACES.md")));
const docs = read("docs/MOBILE_V2_ACTIVE_SURFACES.md");
assert.match(docs, /light-theme only/i);
assert.match(docs, /@legacy-mobile-screen/);

const theme = read("src/theme/ThemeContext.tsx");
assert.match(theme, /light-theme only|lightOnly/i);
assert.match(theme, /isDark:\s*false/);
assert.doesNotMatch(theme, /useColorScheme/);

const settings = read("src/screens/SettingsScreen.tsx");
assert.match(settings, /settings\.lightThemeOnly/);
assert.match(settings, /settings\.lightThemeOnlyHint/);
assert.doesNotMatch(settings, /toggleTheme|setDarkMode\(/);

const colors = read("mobile/lib/theme.ts");
assert.match(colors, /textMutedReadable:\s*"#5B6B7A"/);
assert.match(colors, /Semantic\s*=\s*\{[\s\S]*textMutedReadable/);

console.log("Theme safety checks passed.");
