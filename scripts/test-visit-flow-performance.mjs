/**
 * Regression test — visit-flow performance + contextual header icons.
 *
 * Pins: (1) the visit shell's narrow store subscription (no re-render of all
 * panes per keystroke), (2) in-flight request deduplication + the 30s
 * freshness window in visitFormOptionsApi with forced-refresh bypass and
 * per-crop isolation, and (3) the contextual Ionicons header icons on all
 * six visit steps.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const shell = readFileSync("mobile/app/visit/index.tsx", "utf8");
const optionsApi = readFileSync("mobile/lib/visitFormOptionsApi.ts", "utf8");
const header = readFileSync("mobile/components/visit/VisitFlowHeader.tsx", "utf8");
const step1 = readFileSync("mobile/app/visit/create-step1.tsx", "utf8");
const step2 = readFileSync("mobile/app/visit/create-step2.tsx", "utf8");
const problem = readFileSync("mobile/app/visit/create-step-problem.tsx", "utf8");
const step5 = readFileSync("mobile/app/visit/create-step3.tsx", "utf8");
const step6 = readFileSync("mobile/app/visit/create-step4-review.tsx", "utf8");

test("shell subscribes only to the draft-empty flag", () => {
  assert.match(shell, /useVisitFormStore\(\(s\) => s\.hasFormData\(\)\)/);
  assert.doesNotMatch(
    shell,
    /const draftState = useVisitFormStore\(\)/,
    "whole-store subscription re-renders every pane on each keystroke"
  );
});

test("visit form options requests are deduplicated in-flight", () => {
  assert.match(optionsApi, /formOptionsInflight/);
  assert.match(optionsApi, /if \(formOptionsInflight\) return formOptionsInflight/);
  assert.match(optionsApi, /formOptionsInflight = null/);
});

test("30s freshness window skips redundant revalidation", () => {
  assert.match(optionsApi, /FRESH_WINDOW_MS = 30_000/);
  assert.match(optionsApi, /Date\.now\(\) - formOptionsLastFetch < FRESH_WINDOW_MS/);
  assert.match(optionsApi, /formOptionsLastFetch = Date\.now\(\)/);
});

test("forced refresh and authoritative options always revalidate", () => {
  assert.match(optionsApi, /refreshAuthoritativeVisitFormOptions[\s\S]*refreshFormOptionsDeduped\(true\)/);
  // Cache-miss path must not be short-circuited by the freshness window.
  assert.match(optionsApi, /await refreshFormOptionsDeduped\(true\)/);
});

test("crop problem items dedupe is per-crop and cache-miss forces revalidate", () => {
  assert.match(optionsApi, /cropItemsInflight = new Map/);
  assert.match(optionsApi, /cropItemsFetchedAt/);
  assert.match(optionsApi, /revalidateCropProblemItemsDeduped\(cropId, true\)/);
  // A failed revalidate never overwrites the last good cache.
  assert.match(optionsApi, /keep last cache/);
});

test("all six visit steps show contextual header icons", () => {
  assert.match(header, /icon\?: keyof typeof Ionicons\.glyphMap/);
  assert.match(header, /titleIconWrap/);
  assert.match(header, /size=\{20\} color=\{Colors\.brand700\}/);
  assert.match(step1, /icon="person-outline"/, "Farmer & Field");
  assert.match(step2, /icon="leaf-outline"/, "Crop");
  assert.match(problem, /icon=\{kind === "pest" \? "bug-outline" : "medkit-outline"\}/, "Pest/Disease");
  assert.match(step5, /icon="camera-outline"/, "Evidence");
  assert.match(step6, /icon="clipboard-outline"/, "Review");
});
