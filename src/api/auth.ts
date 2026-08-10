import { API_BASE_URL, buildApiUrl, getApiHostname } from "./config";
import { apiClient } from "./client";
import {
  DEVICE_SESSION_STORAGE_ERROR,
  clearDeviceSessionId,
  saveDeviceSessionId,
  saveSessionMetadata,
  verifyDeviceSessionSaved
} from "../storage/deviceSessionStorage";
import { getOrCreateDeviceId } from "../storage/deviceIdStorage";
import { getRefreshToken, StoredTokens } from "../storage/tokenStorage";
import { getDeviceInfo } from "../utils/deviceInfo";
import { categorizeLoginNetworkError, logAuthEvent } from "../utils/loginDiagnostics";
import { normalizeLoginResponse } from "../utils/parseLoginResponse";
import { ApiRequestError } from "../utils/apiError";
import { isLegacyEmployeeIdIdentifier } from "../utils/mobileLoginUsername";

const MOBILE_AUTH_LOGIN = "mobile/auth/login/";

function devLogLogin(message: string) {
  if (__DEV__) {
    console.log(`[Auth] ${message}`);
  }
}

async function persistLoginSession(normalized: ReturnType<typeof normalizeLoginResponse>, deviceId: string) {
  devLogLogin(`device_session_id present=${Boolean(normalized.deviceSessionId)}`);
  try {
    // Never keep a revoked DeviceSession alongside a new login response.
    await clearDeviceSessionId().catch(() => undefined);
    await saveDeviceSessionId(normalized.deviceSessionId);
    await saveSessionMetadata({
      sessionVersion: normalized.sessionVersion,
      activeDeviceId: normalized.activeDeviceId ?? deviceId
    });
    const verified = await verifyDeviceSessionSaved(normalized.deviceSessionId);
    devLogLogin(`device_session saved=${verified}`);
    if (!verified) {
      throw new Error(DEVICE_SESSION_STORAGE_ERROR);
    }
  } catch (err) {
    devLogLogin(`device_session saved=false (${err instanceof Error ? err.message : "unknown"})`);
    if (err instanceof Error && err.message === DEVICE_SESSION_STORAGE_ERROR) {
      throw err;
    }
    throw new Error(DEVICE_SESSION_STORAGE_ERROR);
  }
}

export async function loginRequest(identifier: string, password: string): Promise<StoredTokens> {
  logAuthEvent("login_pressed");
  const trimmed = identifier.trim();
  if (!trimmed || !password.trim()) {
    logAuthEvent("validation_failed", "missing_credentials");
    throw new Error("Missing credentials");
  }

  logAuthEvent("validation_passed");
  const deviceInfo = getDeviceInfo();
  const deviceId = await getOrCreateDeviceId();

  const loginBody = isLegacyEmployeeIdIdentifier(trimmed)
    ? { employee_id: trimmed, password, device_id: deviceId, ...deviceInfo }
    : { username: trimmed, password, device_id: deviceId, ...deviceInfo };

  logAuthEvent("request_start", `host=${getApiHostname()} path=${MOBILE_AUTH_LOGIN}`);

  try {
    const raw = await apiClient<unknown>(MOBILE_AUTH_LOGIN, {
      method: "POST",
      auth: false,
      body: JSON.stringify(loginBody),
      source: "login"
    });

    logAuthEvent("response_ok", `host=${getApiHostname()}`);
    devLogLogin("login success received");

    const normalized = normalizeLoginResponse(raw);
    await persistLoginSession(normalized, deviceId);

    return { access: normalized.access, refresh: normalized.refresh };
  } catch (error) {
    const category = categorizeLoginNetworkError(error);
    logAuthEvent("request_failed", `category=${category} host=${getApiHostname()} path=${MOBILE_AUTH_LOGIN}`);
    if (__DEV__) {
      console.warn(`[Auth] Login URL: ${buildApiUrl(MOBILE_AUTH_LOGIN, API_BASE_URL)}`);
    }
    throw error;
  }
}

/** Canonical mobile logout — revokes EmployeeDeviceSession (web `auth/logout/` does not). */
export const MOBILE_AUTH_LOGOUT = "mobile/auth/logout/";

/** Single-flight logout — repeated taps / overlapping teardowns share one request. */
let logoutFlight: Promise<void> | null = null;

export async function logoutRequest(): Promise<void> {
  if (logoutFlight) {
    return logoutFlight;
  }

  logoutFlight = (async () => {
    try {
      const refresh = await getRefreshToken();
      // apiClient attaches Bearer + X-Device-Session when available.
      // Network / 401 / 403 / 429 failures must not block local sign-out.
      await apiClient(MOBILE_AUTH_LOGOUT, {
        method: "POST",
        body: JSON.stringify(refresh ? { refresh } : {})
      });
    } catch (err) {
      if (err instanceof ApiRequestError && (err.status === 429 || err.status === 401 || err.status === 403)) {
        return;
      }
      if (__DEV__) {
        console.warn("[Auth] logout request failed", err instanceof Error ? err.message : "unknown");
      }
    } finally {
      logoutFlight = null;
    }
  })();

  return logoutFlight;
}
