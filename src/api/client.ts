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
import { setConnectivityOnline } from "../utils/connectivityBus";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";

type ApiOptions = RequestInit & {
  auth?: boolean;
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
  meta: { auth: boolean; hasToken: boolean; hasDeviceSession: boolean; status?: number }
) {
  if (!__DEV__) return;
  console.log(
    `[API] ${path} | auth=${meta.auth ? "yes" : "no"} token=${meta.hasToken ? "yes" : "no"} deviceSession=${meta.hasDeviceSession ? "yes" : "no"}${meta.status != null ? ` status=${meta.status}` : ""}`
  );
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiRequestError("Server returned an unexpected response. Please try again.", {
      code: "INVALID_RESPONSE"
    });
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

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;
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
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      body
    });

  try {
    let response = await request();
    devLogApi(path, { auth, hasToken, hasDeviceSession, status: response.status });

    if (response.status === 401 && auth) {
      try {
        const newAccess = await refreshAccessTokenOnce();
        hasToken = true;
        requestHeaders.set("Authorization", `Bearer ${newAccess}`);
        hasDeviceSession = await applyDeviceSessionHeader(requestHeaders);
        response = await request();
        devLogApi(`${path} (retry)`, { auth, hasToken, hasDeviceSession, status: response.status });
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

    setConnectivityOnline(true);
    return (await parseResponse(response, { auth })) as T;
  } catch (err) {
    if (isDeviceSessionConflict(err) || isAuthExpiredError(err)) {
      throw err;
    }
    if (isNetworkError(err)) {
      setConnectivityOnline(false);
      throw networkError();
    }
    if (err instanceof ApiRequestError) {
      throw err;
    }
    throw err;
  }
}
