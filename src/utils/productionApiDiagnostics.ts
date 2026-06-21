import {
  API_BASE_URL,
  buildApiUrl,
  PRODUCTION_API_BASE_URL,
  PRODUCTION_API_ENDPOINTS,
  PRODUCTION_API_HOST,
  PRODUCTION_API_ORIGIN,
  PRODUCTION_MEDIA_ORIGIN
} from "../api/config";

export type ApiFailureRecord = {
  url: string;
  status?: number;
  message: string;
  at: string;
};

export type BackendSmokeResult = {
  url: string;
  ok: boolean;
  status?: number;
  ms: number;
  detail: string;
};

/** Hermes on release APK may not expose AbortSignal.timeout — polyfill for diagnostics only. */
function fetchAbortSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = controller.signal;
  signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return signal;
}

let lastApiFailure: ApiFailureRecord | null = null;
let lastSmokeResults: BackendSmokeResult[] | null = null;
let lastSmokeAt: string | null = null;

export function recordApiFailure(input: {
  url: string;
  status?: number;
  message: string;
}) {
  lastApiFailure = {
    url: input.url,
    status: input.status,
    message: input.message,
    at: new Date().toISOString()
  };
  console.warn(
    `[API] Failure recorded: ${input.status ?? "network"} ${input.url} — ${input.message}`
  );
}

export function getLastApiFailure(): ApiFailureRecord | null {
  return lastApiFailure;
}

export function getProductionDiagnosticsSnapshot() {
  return {
    apiBaseUrl: API_BASE_URL,
    loginUrl: buildApiUrl("mobile/auth/login/", API_BASE_URL),
    farmersUrl: PRODUCTION_API_ENDPOINTS.farmers,
    visitsUrl: PRODUCTION_API_ENDPOINTS.visits,
    dutyStartUrl: PRODUCTION_API_ENDPOINTS.dutyStart,
    locationUpdateUrl: PRODUCTION_API_ENDPOINTS.locationUpdate,
    locationBulkUrl: PRODUCTION_API_ENDPOINTS.locationBulk,
    heartbeatUrl: PRODUCTION_API_ENDPOINTS.heartbeat,
    mediaOrigin: PRODUCTION_MEDIA_ORIGIN,
    buildEnvOrigin: PRODUCTION_API_ORIGIN,
    cleartextAssumed: true,
    lastFailure: lastApiFailure,
    lastSmokeAt,
    lastSmokeResults
  };
}

async function probeUrl(url: string, timeoutMs = 15000): Promise<BackendSmokeResult> {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*" },
      signal: fetchAbortSignal(timeoutMs)
    });
    const ms = Date.now() - started;
    const text = (await response.text()).slice(0, 120);
    return {
      url,
      ok: response.status < 500,
      status: response.status,
      ms,
      detail: text || `HTTP ${response.status}`
    };
  } catch (err) {
    return {
      url,
      ok: false,
      ms: Date.now() - started,
      detail: err instanceof Error ? err.message : String(err)
    };
  }
}

/** Safe connectivity probe — no auth, no secrets. */
export async function runBackendSmokeTest(): Promise<BackendSmokeResult[]> {
  const targets = [
    `${PRODUCTION_API_ORIGIN}/healthz/`,
    `${PRODUCTION_API_ORIGIN}/health/`,
    PRODUCTION_API_BASE_URL,
    PRODUCTION_API_ENDPOINTS.farmers
  ];

  const results: BackendSmokeResult[] = [];
  for (const url of targets) {
    results.push(await probeUrl(url));
  }

  lastSmokeResults = results;
  lastSmokeAt = new Date().toISOString();
  console.warn("[App] Backend smoke test:", JSON.stringify(results));
  return results;
}

export function isProductionHostUrl(url: string): boolean {
  return url.includes(PRODUCTION_API_HOST);
}
