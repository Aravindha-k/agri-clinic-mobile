#!/usr/bin/env node
/**
 * en/ta localization key parity + interpolation placeholder parity.
 * Run with: node --experimental-strip-types scripts/test-localization-parity.mjs
 * (package.json wires the same flag)
 */
import assert from "node:assert/strict";
import { en } from "../src/i18n/en.ts";
import { ta } from "../src/i18n/ta.ts";

function flatten(obj, prefix = "", out = new Map()) {
  if (obj == null || typeof obj !== "object") return out;
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(next, value);
    else flatten(value, next, out);
  }
  return out;
}

function placeholders(s) {
  return [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(",");
}

const enMap = flatten(en);
const taMap = flatten(ta);

const missingInTa = [...enMap.keys()].filter((k) => !taMap.has(k));
const missingInEn = [...taMap.keys()].filter((k) => !enMap.has(k));
const emptyTa = [...taMap.entries()].filter(([, v]) => !String(v).trim()).map(([k]) => k);

assert.deepEqual(missingInTa, [], `Missing Tamil keys:\n${missingInTa.join("\n")}`);
assert.deepEqual(missingInEn, [], `Missing English keys:\n${missingInEn.join("\n")}`);
assert.deepEqual(emptyTa, [], `Empty Tamil values:\n${emptyTa.join("\n")}`);

const placeholderMismatches = [];
for (const key of enMap.keys()) {
  const a = placeholders(enMap.get(key));
  const b = placeholders(taMap.get(key) ?? "");
  if (a !== b) placeholderMismatches.push(`${key}: en(${a}) ta(${b})`);
}
assert.deepEqual(placeholderMismatches, [], `Placeholder mismatches:\n${placeholderMismatches.join("\n")}`);

for (const prefix of ["login.", "a11y.", "map.", "startup.", "workdayUx.", "settings."]) {
  const count = [...enMap.keys()].filter((k) => k.startsWith(prefix)).length;
  assert.ok(count > 0, `Expected keys under ${prefix}`);
}

assert.ok(enMap.has("settings.lightThemeOnlyHint"));
assert.match(enMap.get("settings.lightThemeOnlyHint"), /future update/i);
assert.ok(enMap.has("a11y.startWorkdayHint"));
assert.ok(enMap.has("login.submit"));
assert.ok(enMap.has("map.couldNotLoad"));

console.log(`Localization parity OK — ${enMap.size} keys, placeholders aligned.`);
