/**
 * Regression test — final selection-screen UX corrections.
 *
 * Pins: (1) shared bilingualLabel utility (Tamil / English, single combined
 * label, single-language fallback, no empty separator), (2) the oversized
 * Previous Visit card removed from selection screens, (3) combined labels on
 * problem cards, crop sheet, selected-crop card and review, (4) bilingual
 * search behaviour preserved, and (5) the six-step navigation constants
 * remain intact (no backward-step regressions).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const util = readFileSync("src/utils/bilingualName.ts", "utf8");
const problemCard = readFileSync("mobile/components/visit/step2/ProblemSelectCard.tsx", "utf8");
const cropCard = readFileSync("mobile/components/visit/step2/CropSelectionCard.tsx", "utf8");
const sheet = readFileSync("mobile/components/visit/MasterSelectSheet.tsx", "utf8");
const step2 = readFileSync("mobile/app/visit/create-step2.tsx", "utf8");
const problemStep = readFileSync("mobile/app/visit/create-step-problem.tsx", "utf8");
const evidence = readFileSync("mobile/app/visit/create-step3.tsx", "utf8");
const review = readFileSync("mobile/app/visit/create-step4-review.tsx", "utf8");
const store = readFileSync("mobile/store/visitFormStore.ts", "utf8");
const en = readFileSync("src/i18n/en.ts", "utf8");
const ta = readFileSync("src/i18n/ta.ts", "utf8");

test("bilingualLabel is Tamil-first with ' / ' separator and single-language fallback", () => {
  assert.match(util, /\$\{ta\} \/ \$\{en\}/, "combined format must be 'ta / en'");
  assert.match(util, /ta \&\& en \&\& ta !== en/, "only joins when both exist and differ");
  assert.match(util, /return ta \|\| en/, "fallback never emits an empty separator");
});

test("problem cards render one combined bilingual label (no stacked secondary name)", () => {
  assert.match(problemCard, /bilingualLabel\(item\.name, item\.tamil_name\)/);
  assert.doesNotMatch(problemCard, /styles\.secondary/, "stacked secondary name removed");
});

test("crop sheet items use the bilingual combined row", () => {
  assert.match(step2, /subtitle: c\.name_ta \|\| undefined,\s*\n\s*bilingual: true/);
  assert.match(sheet, /bilingualLabel\(item\.title, item\.subtitle\)/);
});

test("selected-crop card and review show combined bilingual labels", () => {
  assert.match(cropCard, /bilingualLabel\(cropName, cropTamilName\)/);
  assert.match(review, /bilingualLabel\(item\.name, item\.tamil_name\)/);
  assert.match(review, /bilingualLabel\(cropName, cropTamilName\)/);
  assert.match(store, /cropTamilName/);
});

test("oversized Previous Visit card removed from crop/pest/disease screens", () => {
  for (const src of [step2, problemStep]) {
    assert.doesNotMatch(src, /VisitRevisitContextCard/);
    assert.doesNotMatch(src, /revisitContextWrap/);
  }
});

test("search covers Tamil and English with trim + case-insensitive matching", () => {
  // Problem screens search both names.
  assert.match(problemStep, /`\$\{item\.name \?\? ""\} \$\{item\.tamil_name \?\? ""\}`\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(problemStep, /problemQuery\.trim\(\)\.toLowerCase\(\)/);
  // Crop sheet searches title (English) + subtitle (Tamil) via prefix helper.
  assert.match(sheet, /anyFieldStartsWithSearch\(needle, item\.title, item\.subtitle\)/);
});

test("search placeholder is bilingual in both locales", () => {
  assert.match(en, /search: "Search \/ தேடுக/);
  assert.match(ta, /search: "தேடுக \/ Search/);
});

test("six-step continue chain unchanged (Step 5 still advances to step 6)", () => {
  assert.match(evidence, /setStep\(6\)/);
  assert.doesNotMatch(evidence, /continueToReview[\s\S]*?setStep\(4\)/);
  assert.match(problemStep, /onContinue=\{\(\) => setStep\(4\)\}/);
  assert.match(problemStep, /onContinue=\{\(\) => setStep\(5\)\}/);
});
