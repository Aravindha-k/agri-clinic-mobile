/**
 * CI health probe against the configured production backend (no auth).
 * Run: node scripts/verify-production-api-health.mjs
 */
import { originFromApiBase, validateProductionApiEnv } from "./lib/apiConfigEnv.mjs";

const TIMEOUT_MS = 20_000;

async function probe(url) {
  const started = Date.now();
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  const ms = Date.now() - started;
  const text = (await response.text()).slice(0, 120);
  return { url, status: response.status, ms, sample: text };
}

let hostname;
let origin;

try {
  ({ hostname, origin } = validateProductionApiEnv());
} catch (err) {
  console.error(`[verify-production-api-health] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

const candidates = [`${origin}/healthz/`, `${origin}/health/`, `${origin}/livez/`, `${origin}/readyz/`];

console.log(`Probing health endpoints for hostname: ${hostname}`);

let lastError = null;

for (const url of candidates) {
  try {
    const result = await probe(url);
    if (result.status > 0 && result.status < 500) {
      console.log(
        `[OK] ${hostname} health check passed (${url} -> HTTP ${result.status}, ${result.ms}ms)`
      );
      if (result.sample) {
        console.log(`     sample: ${result.sample}`);
      }
      process.exit(0);
    }
    console.log(`[skip] ${url} -> HTTP ${result.status}`);
  } catch (err) {
    lastError = err;
    console.log(`[skip] ${url} -> ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.error(
  `[verify-production-api-health] No health endpoint reachable for ${hostname}. Last error: ${
    lastError instanceof Error ? lastError.message : String(lastError ?? "unknown")
  }`
);
process.exit(1);
