import * as SecureStore from "expo-secure-store";

const DEVICE_SESSION_KEY = "agri_clinic_device_session_id";
const SESSION_VERSION_KEY = "agri_clinic_session_version";
const ACTIVE_DEVICE_ID_KEY = "agri_clinic_active_device_id";

let cachedSessionId: string | null | undefined;
let cachedSessionVersion: string | null | undefined;
let cachedActiveDeviceId: string | null | undefined;

async function readKey(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/** Warm device session cache before authenticated bootstrap calls. */
export async function ensureDeviceSessionLoaded(): Promise<void> {
  if (cachedSessionId === undefined) {
    cachedSessionId = await readKey(DEVICE_SESSION_KEY);
  }
  if (cachedSessionVersion === undefined) {
    cachedSessionVersion = await readKey(SESSION_VERSION_KEY);
  }
  if (cachedActiveDeviceId === undefined) {
    cachedActiveDeviceId = await readKey(ACTIVE_DEVICE_ID_KEY);
  }
}

export async function getDeviceSessionId(): Promise<string | null> {
  if (cachedSessionId === undefined) {
    await ensureDeviceSessionLoaded();
  }
  return cachedSessionId ?? null;
}

export async function getSessionVersion(): Promise<string | null> {
  if (cachedSessionVersion === undefined) {
    await ensureDeviceSessionLoaded();
  }
  return cachedSessionVersion ?? null;
}

export async function getActiveDeviceId(): Promise<string | null> {
  if (cachedActiveDeviceId === undefined) {
    await ensureDeviceSessionLoaded();
  }
  return cachedActiveDeviceId ?? null;
}

export async function saveDeviceSessionId(sessionId: string) {
  const trimmed = sessionId.trim();
  if (!trimmed) return;
  cachedSessionId = trimmed;
  await SecureStore.setItemAsync(DEVICE_SESSION_KEY, trimmed);
}

export async function saveSessionMetadata(options: {
  sessionVersion?: string | number | null;
  activeDeviceId?: string | null;
}) {
  if (options.sessionVersion != null && String(options.sessionVersion).trim()) {
    const value = String(options.sessionVersion).trim();
    cachedSessionVersion = value;
    await SecureStore.setItemAsync(SESSION_VERSION_KEY, value);
  }
  if (options.activeDeviceId?.trim()) {
    cachedActiveDeviceId = options.activeDeviceId.trim();
    await SecureStore.setItemAsync(ACTIVE_DEVICE_ID_KEY, cachedActiveDeviceId);
  }
}

export async function clearDeviceSessionId() {
  cachedSessionId = null;
  cachedSessionVersion = null;
  cachedActiveDeviceId = null;
  await SecureStore.deleteItemAsync(DEVICE_SESSION_KEY);
  await SecureStore.deleteItemAsync(SESSION_VERSION_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(ACTIVE_DEVICE_ID_KEY).catch(() => undefined);
}
