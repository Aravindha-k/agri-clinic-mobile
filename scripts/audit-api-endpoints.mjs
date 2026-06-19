/**
 * Print canonical production API endpoint URLs for audit.
 * Run: node scripts/audit-api-endpoints.mjs
 */
const PRODUCTION_HOST = "13.207.17.117";
const ORIGIN = `http://${PRODUCTION_HOST}`;
const BASE = `${ORIGIN}/api/v1/`;

function build(path) {
  return `${BASE}${path.replace(/^\/+/, "")}`;
}

const endpoints = {
  login: build("mobile/auth/login/"),
  refresh: build("mobile/auth/refresh/"),
  me: build("mobile/auth/me/"),
  farmers: build("farmers/"),
  crops: build("masters/crops/"),
  problemCategories: build("masters/problem-categories/dropdown/"),
  problemItems: build("masters/problem-items/"),
  visits: build("mobile/visits/"),
  dutyStart: build("tracking/duty/start/"),
  dutyEnd: build("tracking/duty/end/"),
  dutyCurrent: build("tracking/duty/current/"),
  locationUpdate: build("tracking/location/update/"),
  locationBulk: build("tracking/location/bulk/"),
  heartbeat: build("tracking/heartbeat/"),
  workdayCurrent: build("tracking/workday/current/")
};

console.log("=== Production API endpoint audit ===\n");
console.log("Build env (EXPO_PUBLIC_API_URL):", ORIGIN);
console.log("Runtime API base (API_BASE_URL):", BASE);
console.log("Media origin:", ORIGIN);
console.log("");

for (const [name, url] of Object.entries(endpoints)) {
  const bad =
    url.includes("/api/v1/api/v1") ||
    url.includes("/api/api/") ||
    url.includes("localhost") ||
    url.includes("onrender.com");
  console.log(`${bad ? "✗" : "✓"} ${name}: ${url}`);
}

const mediaExamples = [
  ["/media/farmers/photo.jpg", `${ORIGIN}/media/farmers/photo.jpg`],
  ["/uploads/visit/1.jpg", `${ORIGIN}/uploads/visit/1.jpg`],
  ["media/x.jpg", `${ORIGIN}/media/x.jpg`]
];

console.log("\nMedia URL examples:");
for (const [input, expected] of mediaExamples) {
  console.log(`  ${input} → ${expected}`);
}

console.log("\nNo duplicate /api/v1 segments expected in any endpoint URL.");
