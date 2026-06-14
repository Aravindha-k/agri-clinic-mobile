/**
 * Live API verification mirroring mobile flattenVisitPayloadForMultipart output.
 */
const BASE = process.env.E2E_API_URL || "http://127.0.0.1:8000/api/v1/";

const ADVICE = {
  recommendation: "Apply neem spray in the evening.",
  observation: "Yellow leaves observed on lower branches during walk.",
  action_taken: "Demonstrated spray to farmer.",
  fertilizer_advice: "20kg DAP per acre.",
  pesticide_advice: "Neem 5% weekly.",
  irrigation_advice: "Light irrigation every 3 days.",
  general_advice: "Monitor for 7 days."
};

async function loginMobile() {
  const res = await fetch(`${BASE}mobile/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      employee_id: "E1",
      password: "x",
      device_id: `mobile-verify-${Date.now()}`,
      platform: "android"
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Login failed ${res.status}`);
  return { token: json.access, session: json.device_session_id };
}

async function loginAdmin() {
  const res = await fetch(`${BASE}auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Admin login failed ${res.status}`);
  return json.access;
}

function mobileFlat(extra = {}) {
  return {
    farmer_id: "682",
    farmer_name: "Test Farmer",
    farmer_phone: "9888777666",
    village_id: "118",
    crop_id: "84",
    crop_name: "Amla",
    acreage: "1",
    problem_category_id: "16",
    problem_description: "Leaf curl pest damage",
    problem_seen: "Leaf curl pest damage",
    latitude: "12.9716",
    longitude: "77.5946",
    pest_issue: "true",
    disease_issue: "false",
    ...ADVICE,
    ...extra
  };
}

async function submitMultipart(fields, auth) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v != null && v !== "") form.append(k, String(v));
  }
  const res = await fetch(`${BASE}mobile/visits/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${auth.token}`,
      "X-Device-Session": auth.session
    },
    body: form
  });
  const text = await res.text();
  return { status: res.status, text, json: text ? JSON.parse(text) : null };
}

async function verifyAdmin(visitId, adminToken) {
  const res = await fetch(`${BASE}admin/visits/${visitId}/`, {
    headers: { Authorization: `Bearer ${adminToken}`, Accept: "application/json" }
  });
  const row = await res.json();
  const checks = {
    recommendation: "Apply neem spray",
    observation: "Yellow leaves",
    action_taken: "Demonstrated spray",
    fertilizer_advice: "20kg DAP",
    pesticide_advice: "Neem 5%",
    irrigation_advice: "Light irrigation",
    general_advice: "Monitor for 7 days"
  };
  const failed = [];
  for (const [key, needle] of Object.entries(checks)) {
    if (!String(row[key] ?? "").includes(needle)) failed.push(key);
  }
  if (row.follow_up_required !== true) failed.push("follow_up_required");
  if (!row.next_visit_date) failed.push("next_visit_date");
  return { ok: failed.length === 0, failed, row };
}

async function main() {
  console.log("=== Live Mobile Payload API Verification ===\n");
  let auth;
  try {
    auth = await loginMobile();
  } catch (e) {
    console.error("[BLOCKED] Local backend login:", e.message);
    process.exit(1);
  }

  const adminToken = await loginAdmin().catch(() => null);

  // 1. Online multipart + follow-up true (mirrors flattenPayload boolean coercion)
  const syncId1 = `mobile-online-fu-${Date.now()}`;
  const r1 = await submitMultipart(
    mobileFlat({
      follow_up_required: "true",
      follow_up_date: "2026-06-21",
      next_visit_date: "2026-06-21",
      local_sync_id: syncId1
    }),
    auth
  );
  const id1 = r1.json?.data?.visit_id;
  console.log(
    r1.status === 200 ? "[PASS]" : "[FAIL]",
    "Online multipart follow_up_required=true →",
    r1.status,
    id1 ? `visit_id=${id1}` : r1.text.slice(0, 200)
  );

  // 2. Offline queue sync (same flattened fields, different local_sync_id)
  const syncId2 = `mobile-offline-fu-${Date.now()}`;
  const r2 = await submitMultipart(
    mobileFlat({
      follow_up_required: "true",
      follow_up_date: "2026-06-21",
      next_visit_date: "2026-06-21",
      local_sync_id: syncId2
    }),
    auth
  );
  const id2 = r2.json?.data?.visit_id;
  console.log(
    r2.status === 200 ? "[PASS]" : "[FAIL]",
    "Offline queue sync payload (multipart) →",
    r2.status,
    id2 ? `visit_id=${id2}` : r2.text.slice(0, 200)
  );

  // 3. Recommendation + observation together
  const syncId3 = `mobile-rec-obs-${Date.now()}`;
  const r3 = await submitMultipart(
    mobileFlat({
      follow_up_required: "false",
      local_sync_id: syncId3
    }),
    auth
  );
  const id3 = r3.json?.data?.visit_id;
  console.log(
    r3.status === 200 ? "[PASS]" : "[FAIL]",
    "Recommendation + observation together →",
    r3.status,
    id3 ? `visit_id=${id3}` : r3.text.slice(0, 200)
  );

  if (adminToken && id1) {
    const v = await verifyAdmin(id1, adminToken);
    console.log(
      v.ok ? "[PASS]" : "[FAIL]",
      "Admin visit detail all advice fields →",
      v.ok ? "complete" : `missing: ${v.failed.join(", ")}`
    );
    if (!v.ok) {
      console.log("       ", {
        recommendation: v.row.recommendation,
        observation: v.row.observation,
        follow_up_required: v.row.follow_up_required,
        next_visit_date: v.row.next_visit_date
      });
    }
  }

  const allPass = [r1, r2, r3].every((r) => r.status === 200);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
