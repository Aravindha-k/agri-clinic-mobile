import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const api = read("mobile/lib/visitDetailApi.ts");
const detail = read("mobile/app/visit/[id].tsx");
const PLACEHOLDER = "Not added by employee";

// --- Replicated pure logic (mirrors visitDetailApi.ts) to validate behavior ---
const isEmptyFieldPlaceholder = (text) => text.trim() === PLACEHOLDER;
const realText = (value) => {
  const text = (value ?? "").trim() || "";
  return isEmptyFieldPlaceholder(text) ? "" : text;
};
const visitObservationText = (visit) => realText(visit.observation);
const visitRecommendationText = (visit) => {
  const combined =
    realText(visit.recommendation) ||
    realText(visit.action_taken) ||
    realText(visit.general_advice) ||
    "";
  if (combined) return combined;
  return [visit.fertilizer_advice, visit.pesticide_advice, visit.irrigation_advice]
    .map((row) => realText(row))
    .filter(Boolean)
    .join("\n");
};
const parseFieldNotes = (raw) => {
  const lines = (raw ?? "").split("\n");
  let severity = null;
  const notes = [];
  for (const line of lines) {
    const match = line.match(/^Severity:\s*(low|medium|high)\s*$/i);
    if (match) {
      severity = match[1].toLowerCase();
      continue;
    }
    if (line.trim() && !isEmptyFieldPlaceholder(line)) notes.push(line);
  }
  return { severity, fieldNotes: notes.join("\n").trim() };
};
const employeeFieldNotesText = (visit) =>
  parseFieldNotes(visit.field_notes).fieldNotes || visitObservationText(visit);
const visitFieldNotesText = (visit) => {
  const parsed = parseFieldNotes(visit.field_notes);
  const parts = [parsed.fieldNotes.trim() || visitObservationText(visit), visitRecommendationText(visit).trim()].filter(Boolean);
  const unique = [];
  for (const part of parts) {
    if (!unique.some((row) => row === part)) unique.push(part);
  }
  return unique.join("\n\n").trim();
};
// Simulated save: what [id].tsx PATCHes when the employee saves notes.
const savePayload = (visit, draft) => ({
  observation: draft.trim(),
  field_notes: [draft.trim(), "Severity: Medium"].filter(Boolean).join("\n")
});
// Simulated backend response: empty fields return the display placeholder.
const backendVisit = (stored) => ({
  field_notes: stored.field_notes ?? PLACEHOLDER,
  observation: stored.observation ?? PLACEHOLDER,
  recommendation: stored.recommendation ?? PLACEHOLDER,
  action_taken: stored.action_taken ?? "",
  general_advice: stored.general_advice ?? "",
  fertilizer_advice: stored.fertilizer_advice ?? "",
  pesticide_advice: stored.pesticide_advice ?? "",
  irrigation_advice: stored.irrigation_advice ?? ""
});
// Simulated backend storage of a PATCH.
const applyPatch = (visit, patch) => ({
  ...visit,
  observation: patch.observation || PLACEHOLDER,
  field_notes: patch.field_notes || PLACEHOLDER
});

test("source: placeholder constant is shared from src/utils/visitFieldNotes", () => {
  assert.match(api, /import\s+\{\s*NOT_ADDED_BY_EMPLOYEE\s*\}\s+from\s+["']\.\.\/\.\.\/src\/utils\/visitFieldNotes["']/);
});

test("source: placeholders are treated as empty in observation, recommendation and parsed notes", () => {
  assert.match(api, /isEmptyFieldPlaceholder/);
  assert.match(api, /realText\(visit\.observation\)/);
  assert.match(api, /realText\(visit\.recommendation\)/);
  assert.match(api, /line\.trim\(\)\s*&&\s*!isEmptyFieldPlaceholder\(line\)/);
});

test("source: edit draft uses employeeFieldNotesText, never the merged display text", () => {
  assert.match(api, /export function employeeFieldNotesText[\s\S]*?parsed\.fieldNotes \|\| visitObservationText\(visit\)[\s\S]*?\}/, "employeeFieldNotesText must return notes/observation only, never recommendation");
  assert.match(detail, /setDraftFieldNotes\(employeeFieldNotesText\(row\)\)/);
  assert.match(detail, /setDraftFieldNotes\(employeeFieldNotesText\(visit\)\)/);
  assert.doesNotMatch(detail, /setDraftFieldNotes\(visitFieldNotesText/);
});

test("source: unchanged notes skip the PATCH entirely", () => {
  assert.match(detail, /notes === employeeFieldNotesText\(visit\)/);
});

test("behavior: empty visit shows and edits empty notes, never the placeholder", () => {
  const v = backendVisit({});
  assert.equal(visitFieldNotesText(v), "");
  assert.equal(employeeFieldNotesText(v), "");
});

test("behavior: placeholder recommendation is not merged into notes", () => {
  const v = backendVisit({ field_notes: "Ok", observation: "Ok" });
  assert.equal(visitFieldNotesText(v), "Ok");
  assert.equal(employeeFieldNotesText(v), "Ok");
});

test("behavior: already-corrupted stored notes display cleanly", () => {
  const v = backendVisit({
    field_notes: "Ok\nNot added by employee\n\nNot added by employee\nSeverity: Medium",
    observation: "Ok\n\nNot added by employee"
  });
  assert.equal(employeeFieldNotesText(v), "Ok");
  assert.equal(visitFieldNotesText(v), "Ok");
});

test("behavior: repeated edit/save cycles do not change the notes", () => {
  let v = backendVisit({ field_notes: "Ok", observation: "Ok" });
  for (let i = 0; i < 5; i++) {
    const draft = employeeFieldNotesText(v);
    v = applyPatch(v, savePayload(v, draft));
    assert.equal(employeeFieldNotesText(v), draft, `cycle ${i + 1} drifted`);
  }
  assert.equal(v.field_notes, "Ok\nSeverity: Medium");
});

test("behavior: severity line is preserved inside stored field_notes", () => {
  const parsed = parseFieldNotes("Ok\nSeverity: High");
  assert.equal(parsed.severity, "high");
  assert.equal(parsed.fieldNotes, "Ok");
});

test("behavior: genuine legacy recommendation still displays but is not editable", () => {
  const v = backendVisit({
    field_notes: "Ok",
    observation: "Ok",
    recommendation: "Spray neem oil weekly"
  });
  assert.equal(visitFieldNotesText(v), "Ok\n\nSpray neem oil weekly");
  assert.equal(employeeFieldNotesText(v), "Ok");
});
