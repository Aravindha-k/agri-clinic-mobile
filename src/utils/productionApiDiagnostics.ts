import {
  API_BASE_URL,
  buildApiUrl,
  getApiBuildDiagnostics,
  getApiHostname,
  getApiOrigin,
  getProductionApiEndpoints,
  PRODUCTION_API_HOST
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
    `[API] Failure recorded: ${input.status ?? "network"} host=${getApiHostname()} — ${input.message}`
  );
}

export function getLastApiFailure(): ApiFailureRecord | null {
  return lastApiFailure;
}

export function getProductionDiagnosticsSnapshot() {
  const endpoints = getProductionApiEndpoints();
  const build = getApiBuildDiagnostics();
  const origin = getApiOrigin();
  return {
    apiBaseUrl: API_BASE_URL,
    apiHostname: build.apiHostname,
    loginUrl: buildApiUrl("mobile/auth/login/", API_BASE_URL),
    farmersUrl: endpoints.farmers,
    visitsUrl: endpoints.visits,
    dutyStartUrl: endpoints.dutyStart,
    locationUpdateUrl: endpoints.locationUpdate,
    locationBulkUrl: endpoints.locationBulk,
    heartbeatUrl: endpoints.heartbeat,
    mediaOrigin: origin,
    buildEnv: build.buildEnv,
    appVersion: build.appVersion,
    gitCommit: build.gitCommit,
    configSource: build.configSource,
    cleartextAssumed: API_BASE_URL.startsWith("http://"),
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

/** Safe connectivity probe — uses the configured runtime API origin (HTTP or HTTPS). */
export async function runBackendSmokeTest(): Promise<BackendSmokeResult[]> {
  const origin = getApiOrigin();
  const targets = [
    `${origin}/healthz/`,
    `${origin}/health/`,
    API_BASE_URL,
    buildApiUrl("farmers/", API_BASE_URL)
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
