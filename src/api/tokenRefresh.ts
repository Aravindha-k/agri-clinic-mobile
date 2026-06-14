import { API_BASE_URL } from "./config";
import { getRefreshToken, updateAccessToken } from "../storage/tokenStorage";
import { handleSessionExpired } from "../storage/sessionExpired";
import {
  ApiRequestError,
  formatApiErrorMessage,
  isNetworkError,
  networkError,
  serverError,
  SESSION_EXPIRED_MESSAGE,
  SERVER_MESSAGE
} from "../utils/apiError";
import { classify401Response } from "../utils/authFailure";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";

async function readResponseBody(response: Response): Promise<unknown> {
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

function extractAccessToken(data: unknown): string | null {
  const row =
    (unwrapSuccessEnvelope<Record<string, unknown>>(data) as Record<string, unknown> | null) ??
    (data && typeof data === "object" ? (data as Record<string, unknown>) : null);
  if (!row) return null;
  const access =
    (typeof row.access === "string" && row.access) ||
    (typeof row.access_token === "string" && row.access_token) ||
    (typeof row.token === "string" && row.token);
  return access || null;
}

/** Refresh access token — only logs out on confirmed auth failure (401 / missing refresh). */
export async function refreshAccessTokenShared(): Promise<string> {
  const refresh = await getRefreshToken();
  if (!refresh) {
    await handleSessionExpired();
    throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}mobile/auth/refresh/`, {
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
    const data = await readResponseBody(response);
    const kind = classify401Response(data, 401);
    if (kind === "token_expired") {
      await handleSessionExpired();
      throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
    }
    if (kind === "device_session") {
      throw new ApiRequestError("Device session could not be verified. Please sign in again.", {
        code: "DEVICE_SESSION_REQUIRED",
        status: 401
      });
    }
    throw new ApiRequestError(formatApiErrorMessage(data, "Could not refresh session. Please try again.", 401), {
      code: "AUTH_UNCERTAIN",
      status: 401
    });
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

  const data = await readResponseBody(response);
  const access = extractAccessToken(data);
  if (!access) {
    throw serverError("Session refresh returned an unexpected response.", 502);
  }

  await updateAccessToken(access);
  return access;
}

let refreshFlight: Promise<string> | null = null;

/** Single-flight token refresh to avoid parallel 401 races. */
export function refreshAccessTokenOnce(): Promise<string> {
  if (!refreshFlight) {
    refreshFlight = refreshAccessTokenShared().finally(() => {
      refreshFlight = null;
    });
  }
  return refreshFlight;
}
