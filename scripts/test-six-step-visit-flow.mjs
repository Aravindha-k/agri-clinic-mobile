/**
 * Regression test — six-step visit flow navigation skeleton (Batch A).
 *
 * Verifies the flow Farmer&Field(1) → Crop(2) → Pest(3) →
 * Disease & other issues(4) → Evidence(5) → Review(6):
 * six panes wired in index.tsx, 6-segment StepIndicator, crop-only step 2,
 * shared problem screen with pest/disease sections + skip toggles +
 * Nutrient & Other group, Review zero-problem guard, draft migration
 * (legacy step 3→5, 4→6), persisted noIssue flags, bilingual keys.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const index = readFileSync("mobile/app/visit/index.tsx", "utf8");
const store = readFileSync("mobile/store/visitFormStore.ts", "utf8");
const indicator = readFileSync("mobile/components/visit/StepIndicator.tsx", "utf8");
const problem = readFileSync("mobile/app/visit/create-step-problem.tsx", "utf8");
const cropScreen = readFileSync("mobile/app/visit/create-step2.tsx", "utf8");
const evidence = readFileSync("mobile/app/visit/create-step3.tsx", "utf8");
const review = readFileSync("mobile/app/visit/create-step4-review.tsx", "utf8");
const createBarrel = readFileSync("mobile/app/visit/create.tsx", "utf8");
const en = readFileSync("src/i18n/en.ts", "utf8");
const ta = readFileSync("src/i18n/ta.ts", "utf8");

test("index renders all six panes", () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    assert.ok(index.includes(`displayedStep === ${n}`), `missing pane ${n}`);
  }
});

test("pane ordering and back targets form the six-step chain", () => {
  assert.ok(index.includes("<VisitCreateStep2 onBack={() => setStep(1)} />"));
  assert.ok(index.includes("<VisitCreateStep3Pest onBack={() => setStep(2)} />"));
  assert.ok(index.includes("<VisitCreateStep4Disease onBack={() => setStep(3)} />"));
  assert.ok(index.includes("<VisitCreateStep3 onBack={() => setStep(4)} />"));
  assert.ok(index.includes("onBack={() => setStep(5)}"));
  assert.ok(index.includes("onEditStep2={() => setStep(3)}"));
  assert.ok(index.includes("onEditStep3={() => setStep(5)}"));
});

test("StepIndicator has six segments and labels", () => {
  assert.ok(indicator.includes("[1, 2, 3, 4, 5, 6].map"));
  assert.ok(indicator.includes("1 | 2 | 3 | 4 | 5 | 6"));
  assert.ok(indicator.includes("stepLabelCrop"));
  assert.ok(indicator.includes("stepLabelPest"));
  assert.ok(indicator.includes("stepLabelDisease"));
});

test("store supports six steps, skip flags and per-category clearing", () => {
  assert.ok(store.includes("VisitStep = 1 | 2 | 3 | 4 | 5 | 6"));
  assert.ok(store.includes("noPestIssue"));
  assert.ok(store.includes("noDiseaseIssue"));
  assert.ok(store.includes("setNoPestIssue"));
  assert.ok(store.includes("setNoDiseaseIssue"));
  assert.ok(store.includes("clearProblemsInCategories"));
  assert.ok(store.includes("categoryCodesAreEquivalent"));
});

test("legacy draft step values migrate (3→5 evidence, 4→6 review)", () => {
  assert.ok(store.includes("version: 1"));
  assert.ok(store.includes("migrate:"));
  assert.ok(store.includes("state.step = 5"), "step 3 must migrate to 5");
  assert.ok(store.includes("state.step = 6"), "step 4 must migrate to 6");
  assert.ok(store.includes("noPestIssue: state.noPestIssue"), "skip flags persisted");
  assert.ok(store.includes("noDiseaseIssue: state.noDiseaseIssue"), "skip flags persisted");
});

test("crop step is crop-only and continues to Pest", () => {
  assert.ok(!cropScreen.includes("ProblemSelectCard"), "problem list must not render on crop step");
  assert.ok(cropScreen.includes("restrictProblemsToCrop"), "crop change must keep pruning invalid problems");
  assert.ok(cropScreen.includes("setStep(3)"));
  assert.ok(cropScreen.includes('step2of6'));
});

test("problem screen splits categories and keeps Nutrient & Other on disease step", () => {
  assert.ok(problem.includes('pest: ["pest"]'));
  assert.ok(problem.includes('disease: ["disease"]'));
  assert.ok(problem.includes('["nutrient", "nutrient_issue", "nutrient_deficiency"]'));
  assert.ok(problem.includes("nutrientOtherGroup"), "Nutrient & Other section label");
  assert.ok(problem.includes("<OtherProblemSection"), "manual describe section kept");
  assert.ok(problem.includes("noPestIssue") && problem.includes("noDiseaseIssue"));
  assert.ok(problem.includes("clearProblemsInCategories"), "skip toggle clears that screen's picks");
  assert.ok(problem.includes("toggleProblemItem"));
});

test("evidence and review renumbered to steps 5 and 6", () => {
  assert.ok(evidence.includes("<StepIndicator step={5} />"));
  assert.ok(evidence.includes("step5of6"));
  assert.ok(review.includes("<StepIndicator step={6} allComplete />"));
  assert.ok(review.includes("step6of6"));
});

test("review blocks submit when no problem is selected", () => {
  assert.ok(review.includes("problemEntries.length === 0"));
  assert.ok(review.includes("|| noProblemSelected"));
  assert.ok(review.includes('t("visitFlow.errSelectProblem")'));
});

test("new screens are exported through create.tsx", () => {
  assert.ok(createBarrel.includes("VisitCreateStep3Pest"));
  assert.ok(createBarrel.includes("VisitCreateStep4Disease"));
});

test("Batch B styling: section headers, icon toggles, compact indicator", () => {
  assert.ok(problem.includes("function SectionHeader"), "section headers with icons");
  assert.ok(problem.includes("sectionIconWrap"));
  assert.ok(problem.includes("countPill"), "selected-count pill");
  assert.ok(problem.includes('icon="nutrition-outline"'), "nutrient section icon");
  assert.ok(problem.includes("noIssueIconWrap"), "no-issue toggle card icon");
  const card = readFileSync("mobile/components/visit/step2/ProblemSelectCard.tsx", "utf8");
  assert.ok(card.includes('"checkmark-circle"'), "selected card check state");
  assert.ok(card.includes("Colors.brand700"), "selected card brand border");
  assert.ok(indicator.includes("fontSize: 9.5"), "compact step labels for small screens");
});

test("confirm visit pushes success screen and never rewinds the shell", () => {
  const coordinator = readFileSync("mobile/lib/visit/visitSubmitCoordinator.ts", "utf8");
  const success = readFileSync("mobile/app/visit/success.tsx", "utf8");
  assert.ok(
    !coordinator.includes("beginNewVisit("),
    "coordinator must not reset the draft before the success push"
  );
  assert.ok(
    success.includes("beginNewVisit()"),
    "success screen must consume the draft on mount"
  );
  assert.ok(
    review.includes('StackActions.push("VisitSuccess"'),
    "success navigation must push, never pop back"
  );
});

test("bilingual i18n keys for six-step flow", () => {
  for (const key of [
    "stepLabelCrop", "stepLabelPest", "stepLabelDisease",
    "step2of6", "step3of6", "step4of6", "step5of6", "step6of6",
    "pestTitle", "diseaseTitle", "pestSection", "diseaseSection",
    "nutrientOtherGroup", "noPestIssue", "noDiseaseIssue",
    "hintPestOrSkip", "hintDiseaseOrSkip"
  ]) {
    assert.ok(en.includes(`${key}:`), `en missing ${key}`);
    assert.ok(ta.includes(`${key}:`), `ta missing ${key}`);
  }
  assert.ok(!ta.includes("�"), "corrupted character in ta.ts");
});

test("forward continue chain advances every step (never returns to step 4)", () => {
  // Step 5 Continue-to-review must target step 6 — the old four-step
  // constant setStep(4) sent the user back to Disease & Other Issues.
  assert.match(evidence, /function continueToReview\(\)[\s\S]*?setStep\(6\)/);
  assert.doesNotMatch(evidence, /continueToReview[\s\S]*?setStep\(4\)/, "stale four-step constant");
  // Full forward chain: 1→2, 2→3, pest 3→4, disease 4→5, evidence 5→6.
  assert.match(cropScreen, /setStep\(3\)/);
  assert.match(problem, /onContinue=\{\(\) => setStep\(4\)\}/, "pest continues to disease");
  assert.match(problem, /onContinue=\{\(\) => setStep\(5\)\}/, "disease continues to evidence");
});

test("index maps step 6 to the review pane and step 4 to disease", () => {
  assert.match(index, /displayedStep === 4 \? \(\s*<VisitCreateStep4Disease/);
  assert.match(index, /displayedStep === 6 \? \(\s*<VisitCreateStep4/);
});
