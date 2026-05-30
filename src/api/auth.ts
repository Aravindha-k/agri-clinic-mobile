import { apiClient } from "./client";
import { saveDeviceSessionId } from "../storage/deviceSessionStorage";
import { getOrCreateDeviceId } from "../storage/deviceIdStorage";
import { getRefreshToken, StoredTokens } from "../storage/tokenStorage";
import { getDeviceInfo } from "../utils/deviceInfo";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";

function extractDeviceSessionId(data: unknown): string | null {
  const unwrapped = unwrapSuccessEnvelope<Record<string, unknown>>(data) ?? data;
  if (!unwrapped || typeof unwrapped !== "object") return null;
  const row = unwrapped as Record<string, unknown>;
  const id = row.device_session_id ?? row.deviceSessionId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export async function loginRequest(identifier: string, password: string): Promise<StoredTokens> {
  const trimmed = identifier.trim();
  const deviceInfo = getDeviceInfo();
  const deviceId = await getOrCreateDeviceId();

  const loginBody = /^[A-Za-z]+-\d+$/i.test(trimmed)
    ? { employee_id: trimmed, password, device_id: deviceId, ...deviceInfo }
    : { username: trimmed, password, device_id: deviceId, ...deviceInfo };

  const data = await apiClient<Record<string, string>>("auth/login/", {
    method: "POST",
    auth: false,
    body: JSON.stringify(loginBody)
  });

  const access = data.access || data.access_token || data.token;
  const refresh = data.refresh || data.refresh_token;
  if (!access || !refresh) {
    throw new Error("Login response did not include access and refresh tokens.");
  }

  const deviceSessionId = extractDeviceSessionId(data);
  if (deviceSessionId) {
    await saveDeviceSessionId(deviceSessionId);
  }

  return { access, refresh };
}

export async function logoutRequest() {
  const refresh = await getRefreshToken();
  return apiClient("auth/logout/", {
    method: "POST",
    body: JSON.stringify(refresh ? { refresh } : {})
  });
}
