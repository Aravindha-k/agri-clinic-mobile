import { API_BASE_URL } from "./config";
import { applyDeviceSessionHeader } from "./deviceSessionHeaders";
import { refreshAccessTokenOnce } from "./tokenRefresh";
import { SESSION_REPLACED_CODES, SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { getAccessToken } from "../storage/tokenStorage";
import { handleDeviceSessionConflict, isDeviceSessionConflict } from "../storage/sessionConflict";
import { handleSessionExpired } from "../storage/sessionExpired";
import {
  ApiRequestError,
  extractApiErrorCode,
  formatApiErrorMessage,
  isAuthExpiredError,
  isDeviceSessionConflictPayload,
  isNetworkError,
  isServerError,
  networkError,
  serverError,
  SESSION_EXPIRED_MESSAGE,
  SERVER_MESSAGE
} from "../utils/apiError";
import { classify401Response } from "../utils/authFailure";
import { isLanUrl, LAN_ONLY_MESSAGE, createLanOnlyError } from "../../mobile/lib/api";
import { setConnectivityOnline, setLanOnlyMode } from "../utils/connectivityBus";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";
import { trackApiCall } from "./apiTelemetry";
import { dedupeRequest } from "./requestDedupe";

function recordApiFailureSafe(input: { url: string; status?: number; message: string }) {
  void import("../utils/productionApiDiagnostics")
    .then(({ recordApiFailure }) => recordApiFailure(input))
    .catch(() => undefined);
}

type ApiOptions = RequestInit & {
  auth?: boolean;
  /** Dev telemetry: which screen/module initiated the request. */
  source?: string;
  /** When false, skip in-flight dedupe (default: true for GET). */
  dedupe?: boolean;
  /** Override API root (must end with `/`, e.g. https://host/api/). */
  baseUrl?: string;
};

function shouldRethrowWithoutLogout(error: unknown): boolean {
  return (
    isDeviceSessionConflict(error) ||
    isNetworkError(error) ||
    isServerError(error) ||
    (error instanceof ApiRequestError &&
      (error.code === "INVALID_RESPONSE" ||
        error.code === "INVALID_CREDENTIALS" ||
        error.code === "AUTH_UNCERTAIN" ||
        error.code === "DEVICE_SESSION_REQUIRED"))
  );
}

function devLogApi(
  path: string,
  meta: {
    auth: boolean;
    hasToken: boolean;
    hasDeviceSession: boolean;
    status?: number;
    source?: string;
    duplicate?: boolean;
  }
) {
  trackApiCall(path, meta.source, meta.duplicate);
  if (!__DEV__) return;
  console.log(
    `[API] ${path} | auth=${meta.auth ? "yes" : "no"} token=${meta.hasToken ? "yes" : "no"} deviceSession=${meta.hasDeviceSession ? "yes" : "no"}${meta.status != null ? ` status=${meta.status}` : ""}${meta.source ? ` source=${meta.source}` : ""}${meta.duplicate ? " duplicate" : ""}`
  );
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiRequestError(
      response.ok
        ? "Server returned an unexpected response. Please try again."
        : formatApiErrorMessage(null, "Request failed", response.status),
      {
        code: "INVALID_RESPONSE",
        status: response.status
      }
    );
  }
}

function throw401Error(data: unknown, auth: boolean): never {
  if (!auth) {
    throw new ApiRequestError(formatApiErrorMessage(data, "Invalid username or password.", 401), {
      code: "INVALID_CREDENTIALS",
      status: 401
    });
  }

  const kind = classify401Response(data, 401);
  if (kind === "token_expired") {
    handleSessionExpired();
    throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
  }
  if (kind === "device_session") {
    throw new ApiRequestError("Device session could not be verified. Please try again.", {
      code: "DEVICE_SESSION_REQUIRED",
      status: 401
    });
  }
  throw new ApiRequestError(formatApiErrorMessage(data, "Could not verify your session. Please try again.", 401), {
    code: "AUTH_UNCERTAIN",
    status: 401
  });
}

async function parseResponse(response: Response, options?: { auth?: boolean }) {
  const data = await readResponseBody(response);
  const auth = options?.auth !== false;

  if (!response.ok) {
    const code = extractApiErrorCode(data);
    if (isDeviceSessionConflictPayload(data, response.status)) {
      void handleDeviceSessionConflict();
      throw new ApiRequestError(SESSION_REPLACED_MESSAGE, {
        code: code && SESSION_REPLACED_CODES.has(code) ? code : "SESSION_REPLACED",
        status: response.status
      });
    }
    if (response.status === 401) {
      throw401Error(data, auth);
    }
    if (response.status >= 500) {
      throw serverError(SERVER_MESSAGE, response.status);
    }
    throw new ApiRequestError(formatApiErrorMessage(data, "Request failed", response.status), {
      code: code ?? undefined,
      status: response.status
    });
  }
  const unwrapped = unwrapSuccessEnvelope(data);
  return unwrapped !== null ? unwrapped : data;
}

async function handleAuth401AfterRefresh(response: Response, auth: boolean): Promise<never> {
  const data = await readResponseBody(response);
  throw401Error(data, auth);
}

async function executeApiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, headers, body, source, signal, baseUrl, ...rest } = options;
  const apiRoot = baseUrl ?? API_BASE_URL;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let hasToken = false;
  let hasDeviceSession = false;

  if (auth) {
    const token = await getAccessToken();
    if (token) {
      hasToken = true;
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
    hasDeviceSession = await applyDeviceSessionHeader(requestHeaders);
  }

  const request = () =>
    fetch(`${apiRoot}${path}`, {
      ...rest,
      signal,
      headers: requestHeaders,
      body
    });

  const fullUrl = `${apiRoot}${path}`;

  try {
    let response = await request();
    devLogApi(path, { auth, hasToken, hasDeviceSession, status: response.status, source });

    if (!response.ok) {
      console.warn(`[API] HTTP ${response.status} ${fullUrl}`);
      recordApiFailureSafe({
        url: fullUrl,
        status: response.status,
        message: `HTTP ${response.status}`
      });
    }

    if (response.status === 401 && auth) {
      try {
        const newAccess = await refreshAccessTokenOnce();
        hasToken = true;
        requestHeaders.set("Authorization", `Bearer ${newAccess}`);
        hasDeviceSession = await applyDeviceSessionHeader(requestHeaders);
        response = await request();
        devLogApi(`${path} (retry)`, { auth, hasToken, hasDeviceSession, status: response.status, source });
      } catch (error) {
        if (shouldRethrowWithoutLogout(error) || isAuthExpiredError(error)) {
          throw error;
        }
        throw serverError(SERVER_MESSAGE, 502);
      }
    }

    if (response.status === 401 && auth) {
      await handleAuth401AfterRefresh(response, auth);
    }

    setLanOnlyMode(false);
    setConnectivityOnline(true);
    return (await parseResponse(response, { auth })) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    if (isDeviceSessionConflict(err) || isAuthExpiredError(err)) {
      throw err;
    }
    if (isNetworkError(err)) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn(`[API] Network error ${fullUrl} (${detail})`);
      recordApiFailureSafe({
        url: fullUrl,
        message: detail || "Network request failed"
      });
      if (__DEV__) {
        console.warn(`[API] Cannot reach ${API_BASE_URL} (${detail})`);
      }
      if (isLanUrl(API_BASE_URL)) {
        setLanOnlyMode(true);
        throw createLanOnlyError(LAN_ONLY_MESSAGE);
      }
      setConnectivityOnline(false);
      throw networkError();
    }
    if (err instanceof ApiRequestError) {
      throw err;
    }
    throw err;
  }
}

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const shouldDedupe = options.dedupe !== false && method === "GET" && !options.signal;
  if (!shouldDedupe) {
    return executeApiClient<T>(path, options);
  }
  const key = `${method}:${path}`;
  return dedupeRequest(key, options.source, () => executeApiClient<T>(path, options));
}
