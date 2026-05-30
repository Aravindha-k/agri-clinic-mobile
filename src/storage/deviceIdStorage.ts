import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "agri_clinic_device_id";

function generateDeviceId() {
  return `kavya-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-install device id sent on login as device_id / active_device_id. */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing?.trim()) {
      return existing.trim();
    }
    const created = generateDeviceId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return generateDeviceId();
  }
}
