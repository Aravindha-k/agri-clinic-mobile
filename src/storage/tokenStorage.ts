import * as SecureStore from "expo-secure-store";
import { clearDeviceSessionId } from "./deviceSessionStorage";
import { withTimeout } from "../utils/withTimeout";

const ACCESS_TOKEN_KEY = "agri_clinic_access_token";
const REFRESH_TOKEN_KEY = "agri_clinic_refresh_token";
/** OEM Keystore can hang indefinitely — never block bootstrap. */
const STORE_READ_MS = 2500;

export type StoredTokens = {
  access: string;
  refresh: string;
};

export async function getAccessToken() {
  try {
    return await withTimeout(SecureStore.getItemAsync(ACCESS_TOKEN_KEY), STORE_READ_MS, null, "getAccessToken");
  } catch {
    return null;
  }
}

export async function getRefreshToken() {
  try {
    return await withTimeout(SecureStore.getItemAsync(REFRESH_TOKEN_KEY), STORE_READ_MS, null, "getRefreshToken");
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
