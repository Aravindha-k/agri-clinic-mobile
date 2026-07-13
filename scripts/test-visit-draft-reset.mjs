import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

const store = read("mobile/store/visitFormStore.ts");
const step1 = read("mobile/app/visit/create-step1.tsx");
const beginNewVisit = read("mobile/lib/beginNewVisit.ts");
const biometric = read("src/storage/biometricLoginStorage.ts");
const auth = read("src/storage/AuthContext.tsx");

assert.match(store, /reset:\s*\(\)\s*=>/);
assert.match(store, /fieldNotes:\s*""/);
assert.match(store, /recommendation:\s*""/);
assert.match(store, /observation:\s*""/);
assert.match(beginNewVisit, /export function beginNewVisit/);
assert.match(beginNewVisit, /store\.reset\(\)/);
assert.doesNotMatch(
  step1,
  /hasVisitHistory[\s\S]*applyRevisitPrefill/,
  "create-step1 must not auto-apply revisit prefill on farmer pick"
);
assert.match(biometric, /PROMPT_DISMISSED_KEY/);
assert.match(biometric, /shouldOfferBiometricEnrollment/);
assert.doesNotMatch(
  auth,
  /await saveBiometricLogin\(\)\.catch/,
  "signIn must not auto-enable biometric without user consent"
);
assert.match(auth, /completeBiometricUnlock/);

console.log("visit draft reset + biometric enrollment checks passed");
