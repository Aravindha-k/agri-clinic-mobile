import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const en = readFileSync(new URL("../src/i18n/en.ts", import.meta.url), "utf8");
const ta = readFileSync(new URL("../src/i18n/ta.ts", import.meta.url), "utf8");
const settings = readFileSync(new URL("../src/screens/SettingsScreen.tsx", import.meta.url), "utf8");
const step2 = readFileSync(new URL("../mobile/app/visit/create-step2.tsx", import.meta.url), "utf8");
const step3 = readFileSync(new URL("../mobile/app/visit/create-step3.tsx", import.meta.url), "utf8");
const step4 = readFileSync(new URL("../mobile/app/visit/create-step4-review.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../mobile/app/visit/[id].tsx", import.meta.url), "utf8");

test("no developer-only Expo Go references in user-facing strings", () => {
  assert.ok(!en.includes("Expo Go"), "en.ts must not mention Expo Go");
  assert.ok(!ta.includes("Expo Go"), "ta.ts must not mention Expo Go");
});

test("step3 review button text has no duplicate arrow glyph", () => {
  const enBtn = en.match(/continueToReview: "([^"]+)"/)[1];
  const taBtn = ta.match(/continueToReview: "([^"]+)"/)[1];
  assert.ok(!enBtn.includes("→") && !taBtn.includes("→"), "icon already supplies the arrow");
  assert.ok(step3.includes('name="arrow-forward"'), "single icon arrow stays");
});

test("settings switches define off-track and thumb colors for contrast", () => {
  const switches = settings.match(/<Switch[\s\S]*?\/>/g) ?? [];
  assert.ok(switches.length >= 5, "expected all settings switches");
  for (const sw of switches) {
    assert.ok(sw.includes("false: Colors.border2"), "off track must be visible");
    assert.ok(sw.includes("thumbColor"), "thumb color must be explicit");
  }
});

test("step indicator sits directly under the header on step 2", () => {
  const step = step2.indexOf("<StepIndicator step={2}");
  const summary = step2.indexOf("<VisitFarmerSummaryCard");
  assert.ok(step > -1 && summary > -1);
  assert.ok(step < summary, "step bar must be above the farmer summary (consistent position)");
});

test("step4 review shows bilingual problem labels", () => {
  assert.ok(step4.includes("bilingualLabel(item.name, item.tamil_name)"), "combined Tamil / English label");
  assert.ok(step4.includes("styles.problemLine"), "single combined label line rendered");
  assert.ok(!step4.includes("entry.secondary"), "no stacked secondary line");
});

test("step4 GPS status row is top-aligned with the label", () => {
  const gpsRow = step4.slice(step4.indexOf("gpsRow: {"), step4.indexOf("gpsDot: {"));
  assert.ok(gpsRow.includes('"flex-start"'), "gps row/status must be flex-start aligned");
  assert.ok(step4.includes("marginTop: 5"), "dot aligned to first text line");
});

test("visit detail shows a single crop chip", () => {
  const chips = detail.slice(detail.indexOf("heroChips"), detail.indexOf("</FadeInSection>", detail.indexOf("heroChips")));
  assert.equal((chips.match(/styles\.heroChip\}/g) || []).length, 1, "exactly one crop chip");
  assert.ok(!detail.includes("visit.crop_name !== cropFromVisit(visit)"), "no duplicate raw chip");
});

test("photo add tiles only appear in edit mode", () => {
  assert.ok(detail.includes("editMode && visitAllowsNotesUpdate(visit)"), "add-photo row gated on editMode");
});

test("edit footer floats above the tab bar (no stacked bars)", () => {
  const footer = detail.slice(detail.indexOf("editFooter: {"), detail.indexOf("editFooterBtn: {"));
  assert.ok(footer.includes("borderRadius"), "floating card footer");
  assert.ok(footer.includes("marginBottom"), "separated from bottom nav");
});
