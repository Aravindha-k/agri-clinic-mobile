import { buildApiUrl } from "./config";
import { apiClient } from "./client";
import {
  DEVICE_SESSION_STORAGE_ERROR,
  saveDeviceSessionId,
  saveSessionMetadata,
  verifyDeviceSessionSaved
} from "../storage/deviceSessionStorage";
import { getOrCreateDeviceId } from "../storage/deviceIdStorage";
import { getRefreshToken, StoredTokens } from "../storage/tokenStorage";
import { getDeviceInfo } from "../utils/deviceInfo";
import { normalizeLoginResponse } from "../utils/parseLoginResponse";

const MOBILE_AUTH_LOGIN = "mobile/auth/login/";

function devLogLogin(message: string) {
  if (__DEV__) {
    console.log(`[Auth] ${message}`);
  }
}

async function persistLoginSession(normalized: ReturnType<typeof normalizeLoginResponse>, deviceId: string) {
  devLogLogin(`device_session_id present=${Boolean(normalized.deviceSessionId)}`);
  try {
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
  const trimmed = identifier.trim();
  const deviceInfo = getDeviceInfo();
  const deviceId = await getOrCreateDeviceId();

  const loginBody = /^[A-Za-z]+-\d+$/i.test(trimmed)
    ? { employee_id: trimmed, password, device_id: deviceId, ...deviceInfo }
    : { username: trimmed, password, device_id: deviceId, ...deviceInfo };

  console.warn("[Auth] Login URL:", buildApiUrl(MOBILE_AUTH_LOGIN));

  const raw = await apiClient<unknown>(MOBILE_AUTH_LOGIN, {
    method: "POST",
    auth: false,
    body: JSON.stringify(loginBody)
  });

  devLogLogin("login success received");

  const normalized = normalizeLoginResponse(raw);
  await persistLoginSession(normalized, deviceId);

  return { access: normalized.access, refresh: normalized.refresh };
}

export async function logoutRequest() {
  const refresh = await getRefreshToken();
  return apiClient("auth/logout/", {
    method: "POST",
    body: JSON.stringify(refresh ? { refresh } : {})
  });
}
