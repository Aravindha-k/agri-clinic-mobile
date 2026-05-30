import { API_BASE_URL } from "./config";
import { applyDeviceSessionHeader } from "./deviceSessionHeaders";
import { SESSION_REPLACED_CODES, SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { getAccessToken, getRefreshToken, updateAccessToken } from "../storage/tokenStorage";
import { handleDeviceSessionConflict, isDeviceSessionConflict } from "../storage/sessionConflict";
import { handleSessionExpired } from "../storage/sessionExpired";
import {
  ApiRequestError,
  extractApiErrorCode,
  formatApiErrorMessage,
  isAuthExpiredError,
  isDeviceSessionConflictPayload,
  isNetworkError,
  networkError,
  serverError,
  SESSION_EXPIRED_MESSAGE,
  SERVER_MESSAGE
} from "../utils/apiError";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

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

async function parseResponse(response: Response) {
  const data = await readResponseBody(response);
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
      await handleSessionExpired();
      throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
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

async function refreshAccessToken() {
  const refresh = await getRefreshToken();
  if (!refresh) {
    await handleSessionExpired();
    throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh })
    });
  } catch (err) {
    if (isNetworkError(err)) {
      throw networkError();
    }
    throw err;
  }

  if (response.status === 401) {
    await handleSessionExpired();
    throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw serverError(SERVER_MESSAGE, response.status);
    }
    const data = await readResponseBody(response);
    throw new ApiRequestError(formatApiErrorMessage(data, "Could not refresh session.", response.status), {
      status: response.status
    });
  }

  const data = (await parseResponse(response)) as Record<string, unknown> | null;
  const access =
    (typeof data?.access === "string" && data.access) ||
    (typeof data?.access_token === "string" && data.access_token) ||
    (typeof data?.token === "string" && data.token);
  if (!access) {
    await handleSessionExpired();
    throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
  }
  await updateAccessToken(access);
  return access;
}

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = await getAccessToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
    await applyDeviceSessionHeader(requestHeaders);
  }

  const request = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      body
    });

  try {
    let response = await request();

    if (response.status === 401 && auth) {
      try {
        const newAccess = await refreshAccessToken();
        requestHeaders.set("Authorization", `Bearer ${newAccess}`);
        response = await request();
      } catch (error) {
        if (isDeviceSessionConflict(error) || isNetworkError(error) || isAuthExpiredError(error)) {
          throw error;
        }
        await handleSessionExpired();
        throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
      }
    }

    if (response.status === 401 && auth) {
      await handleSessionExpired();
      throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
    }

    return (await parseResponse(response)) as T;
  } catch (err) {
    if (isDeviceSessionConflict(err) || isAuthExpiredError(err)) {
      throw err;
    }
    if (isNetworkError(err)) {
      throw networkError();
    }
    if (err instanceof ApiRequestError) {
      throw err;
    }
    throw err;
  }
}
