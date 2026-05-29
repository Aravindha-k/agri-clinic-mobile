import { apiClient } from "./client";
import { getRefreshToken, StoredTokens } from "../storage/tokenStorage";

export async function loginRequest(identifier: string, password: string): Promise<StoredTokens> {
  const trimmed = identifier.trim();
  const loginBody = /^[A-Za-z]+-\d+$/i.test(trimmed)
    ? { employee_id: trimmed, password }
    : { username: trimmed, password };

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

  return { access, refresh };
}

export async function logoutRequest() {
  const refresh = await getRefreshToken();
  return apiClient("auth/logout/", {
    method: "POST",
    body: JSON.stringify(refresh ? { refresh } : {})
  });
}
