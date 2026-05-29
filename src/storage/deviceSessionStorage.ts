import * as SecureStore from "expo-secure-store";

const DEVICE_SESSION_KEY = "agri_clinic_device_session_id";

export async function getDeviceSessionId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(DEVICE_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function saveDeviceSessionId(sessionId: string) {
  const trimmed = sessionId.trim();
  if (!trimmed) return;
  await SecureStore.setItemAsync(DEVICE_SESSION_KEY, trimmed);
}

export async function clearDeviceSessionId() {
  await SecureStore.deleteItemAsync(DEVICE_SESSION_KEY);
}
