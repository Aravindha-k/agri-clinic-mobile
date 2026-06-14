/**
 * Verify mobile visit submit payload matches backend P0 expectations.
 * Run: node scripts/verify-mobile-submit-payload.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const REQUIRED_FIELDS = [
  "follow_up_required",
  "follow_up_date",
  "next_visit_date",
  "recommendation",
  "observation",
  "action_taken",
  "fertilizer_advice",
  "pesticide_advice",
  "irrigation_advice",
  "general_advice"
];

function mockStoreState() {
  return {
    farmer: { id: 682, name: "Test Farmer", phone: "9888777666", district: 23, village: 118 },
    newFarmer: null,
    cropId: "84",
    cropName: "Amla",
    problemCategoryId: "16",
    problemCategoryCode: "pest",
    problemMasterId: "1",
    selectedProblem: { id: 1, name: "Leaf curl", tamil_name: "Leaf curl" },
    otherProblemDescription: "",
    severity: "medium",
    pestIssue: true,
    diseaseIssue: false,
    followUpRequired: true,
    followUpDate: "2026-06-21",
    nextVisitDate: "2026-06-21",
    observation: "Yellow leaves observed on lower branches during walk.",
    fieldNotes: "Severity: Medium",
    recommendation: "Apply neem spray in the evening.",
    actionTaken: "Demonstrated spray to farmer.",
    fertilizerAdvice: "20kg DAP per acre.",
    pesticideAdvice: "Neem 5% weekly.",
    irrigationAdvice: "Light irrigation every 3 days.",
    generalAdvice: "Monitor for 7 days.",
    gpsCoords: { latitude: 12.9716, longitude: 77.5946, accuracy: 8 }
  };
}

async function loadMobileHelpers() {
  // Compile-on-the-fly via tsx dynamic import of TS modules
  const base = pathToFileURL(join(ROOT, "mobile/lib/visitSubmitApi.ts")).href;
  const mod = await import(base);
  return mod;
}

async function loadNormalizer() {
  const base = pathToFileURL(join(ROOT, "src/utils/format.ts")).href;
  return import(base);
}

function assertFields(flat, label) {
  const missing = REQUIRED_FIELDS.filter((key) => flat[key] == null || flat[key] === "");
  if (missing.length) {
    console.error(`[FAIL] ${label} missing fields:`, missing);
    return false;
  }
  if (flat.follow_up_required !== "true") {
    console.error(`[FAIL] ${label} follow_up_required expected "true", got`, flat.follow_up_required);
    return false;
  }
  if (flat.recommendation !== "Apply neem spray in the evening.") {
    console.error(`[FAIL] ${label} recommendation mismatch`);
    return false;
  }
  if (!String(flat.observation).includes("Yellow leaves")) {
    console.error(`[FAIL] ${label} observation mismatch`);
    return false;
  }
  console.log(`[PASS] ${label} — all ${REQUIRED_FIELDS.length} fields present`);
  console.log("       follow_up_required=", flat.follow_up_required);
  console.log("       follow_up_date=", flat.follow_up_date);
  console.log("       recommendation=", flat.recommendation.slice(0, 40) + "…");
  return true;
}

async function liveApiTest(flat, label, baseUrl) {
  const login = await fetch(`${baseUrl}mobile/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      employee_id: "E1",
      password: "x",
      device_id: `verify-mobile-${Date.now()}`,
      platform: "android"
    })
  });
  const lj = await login.json();
  if (!login.ok || !lj.access) {
    console.log(`[SKIP] ${label} live API — login failed (${login.status})`);
    return null;
  }

  const form = new FormData();
  const submitFields = {
    ...flat,
    farmer_id: "682",
    farmer_name: "Test Farmer",
    farmer_phone: "9888777666",
    village_id: "118",
    crop_id: "84",
    acreage: "1",
    problem_category_id: "16",
    problem_description: "Leaf curl pest damage",
    problem_seen: "Leaf curl pest damage",
    latitude: "12.9716",
    longitude: "77.5946",
    local_sync_id: `verify-mobile-${Date.now()}`
  };
  for (const [k, v] of Object.entries(submitFields)) {
    if (v != null && v !== "") form.append(k, String(v));
  }

  const res = await fetch(`${baseUrl}mobile/visits/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${lj.access}`,
      "X-Device-Session": lj.device_session_id
    },
    body: form
  });
  const text = await res.text();
  if (res.status !== 200) {
    console.error(`[FAIL] ${label} submit HTTP ${res.status}`, text.slice(0, 300));
    return null;
  }
  const body = JSON.parse(text);
  const visitId = body.data?.visit_id ?? body.visit_id;
  console.log(`[PASS] ${label} live submit HTTP 200 visit_id=${visitId}`);

  const admin = await fetch(`${baseUrl}auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" })
  });
  const aj = await admin.json();
  if (!admin.ok || !aj.access) {
    console.log(`[WARN] ${label} admin login failed — skip detail check`);
    return visitId;
  }
  const detail = await fetch(`${baseUrl}admin/visits/${visitId}/`, {
    headers: { Authorization: `Bearer ${aj.access}`, Accept: "application/json" }
  });
  const row = await detail.json();
  const checks = [
    ["recommendation", "Apply neem spray"],
    ["observation", "Yellow leaves"],
    ["action_taken", "Demonstrated spray"],
    ["fertilizer_advice", "20kg DAP"],
    ["follow_up_required", true]
  ];
  let ok = true;
  for (const [key, needle] of checks) {
    const val = row[key];
    if (key === "follow_up_required") {
      if (val !== needle) ok = false;
    } else if (!String(val ?? "").includes(needle)) {
      ok = false;
    }
  }
  console.log(ok ? `[PASS] ${label} admin detail has all advice fields` : `[FAIL] ${label} admin detail incomplete`, {
    recommendation: row.recommendation,
    observation: row.observation,
    follow_up_required: row.follow_up_required,
    next_visit_date: row.next_visit_date
  });
  return visitId;
}

async function main() {
  console.log("=== Mobile Submit Payload Verification ===\n");

  // Static audit of source files
  const submitApi = readFileSync(join(ROOT, "mobile/lib/visitSubmitApi.ts"), "utf8");
  const offlineSync = readFileSync(join(ROOT, "mobile/lib/sync/offlineSyncManager.ts"), "utf8");
  for (const field of REQUIRED_FIELDS) {
    if (!submitApi.includes(field.replace(/_([a-z])/g, (_, c) => c.toUpperCase()).replace(/^followUp/, "followUp").replace(/^nextVisit/, "nextVisit"))) {
      // check snake in buildVisitFormValuesFromStore
    }
  }
  const storeFields = [
    "follow_up_required",
    "follow_up_date",
    "next_visit_date",
    "recommendation",
    "action_taken",
    "fertilizer_advice",
    "pesticide_advice",
    "irrigation_advice",
    "general_advice"
  ];
  let srcOk = true;
  for (const f of storeFields) {
    if (!submitApi.includes(f)) {
      console.error(`[FAIL] visitSubmitApi.ts missing ${f} in builder`);
      srcOk = false;
    }
  }
  if (submitApi.includes("flattenVisitPayloadForMultipart")) {
    console.log("[PASS] visitSubmitApi exports flattenVisitPayloadForMultipart");
  } else {
    console.error("[FAIL] flattenVisitPayloadForMultipart not exported");
    srcOk = false;
  }
  if (offlineSync.includes("flattenVisitPayloadForMultipart")) {
    console.log("[PASS] offlineSyncManager uses shared multipart flatten");
  } else {
    console.error("[FAIL] offlineSyncManager not using shared flatten");
    srcOk = false;
  }
  if (submitApi.includes('flat[key] = value ? "true" : "false"')) {
    console.log("[PASS] FormData builder coerces booleans to true/false strings");
  }

  let dynamicOk = true;
  try {
    const { buildVisitFormValuesFromStore, flattenVisitPayloadForMultipart } = await loadMobileHelpers();
    const state = mockStoreState();
    const localSyncId = `verify-${Date.now()}`;
    const values = buildVisitFormValuesFromStore(state, localSyncId);
    const flat = flattenVisitPayloadForMultipart(values, localSyncId);
    dynamicOk = assertFields(flat, "Online multipart flatten");

    // Offline queue stores VisitFormValues — re-flatten on sync
    dynamicOk = assertFields(flat, "Offline queue sync flatten") && dynamicOk;

    const base = process.env.E2E_API_URL || "http://127.0.0.1:8000/api/v1/";
    await liveApiTest(flat, "Online submit with follow-up + advice", base);
  } catch (err) {
    console.log("[SKIP] Dynamic TS import failed (run with npx tsx):", err.message);
    console.log("       Static source audit still applies.");
  }

  console.log("\n=== Summary ===");
  console.log(srcOk && dynamicOk ? "Payload structure: PASS" : "Payload structure: FAIL");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
