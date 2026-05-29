/**
 * Smoke-test production API reachability (no credentials required for most checks).
 * Run: node scripts/verify-production-api.mjs
 */
const BASE = "https://agri-clinic-backend.onrender.com/api/v1/";

async function check(name, url, options = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(90000) });
    const ms = Date.now() - started;
    const text = await res.text();
    let body = text.slice(0, 200);
    try {
      const json = JSON.parse(text);
      body = JSON.stringify(json).slice(0, 200);
    } catch {
      /* plain text */
    }
    return { name, ok: res.status < 500, status: res.status, ms, sample: body };
  } catch (err) {
    return { name, ok: false, status: 0, ms: Date.now() - started, sample: String(err.message || err) };
  }
}

const checks = [
  ["Login endpoint", `${BASE}auth/login/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }],
  ["Employee me (auth required)", `${BASE}employees/me/`],
  ["Farmers list (auth required)", `${BASE}farmers/?page=1&page_size=1`],
  ["Mobile visits (auth required)", `${BASE}mobile/visits/`],
  ["Tracking workday (auth required)", `${BASE}tracking/workday/current/`],
  ["Masters districts (auth required)", `${BASE}masters/districts/`]
];

console.log("Production API base:", BASE);
const results = [];
for (const [name, url, opts] of checks) {
  results.push(await check(name, url, opts));
}

let pass = 0;
for (const r of results) {
  const mark = r.ok ? "OK" : "FAIL";
  if (r.ok) pass += 1;
  console.log(`[${mark}] ${r.name} -> HTTP ${r.status} (${r.ms}ms)`);
}
console.log(`\n${pass}/${results.length} endpoints reachable (expect 400/401 without token, not 5xx/timeout).`);
process.exit(pass === results.length ? 0 : 1);
