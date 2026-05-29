import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "agri_clinic_access_token";
const REFRESH_TOKEN_KEY = "agri_clinic_refresh_token";

export type StoredTokens = {
  access: string;
  refresh: string;
};

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveTokens(tokens: StoredTokens) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh);
}

export async function updateAccessToken(access: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
