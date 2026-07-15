import * as SecureStore from "expo-secure-store";
import { clearDeviceSessionId } from "./deviceSessionStorage";

const ACCESS_TOKEN_KEY = "agri_clinic_access_token";
const REFRESH_TOKEN_KEY = "agri_clinic_refresh_token";

export type StoredTokens = {
  access: string;
  refresh: string;
};

export async function getAccessToken() {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: StoredTokens) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh);
}

export async function updateAccessToken(access: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined);
  await clearDeviceSessionId();
}
