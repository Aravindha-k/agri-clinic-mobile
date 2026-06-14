import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const DEVICE_SESSION_KEY = "agri_clinic_device_session_id";
const SESSION_VERSION_KEY = "agri_clinic_session_version";
const ACTIVE_DEVICE_ID_KEY = "agri_clinic_active_device_id";
const FALLBACK_PREFIX = "@agri_clinic_fallback:";

export const DEVICE_SESSION_STORAGE_ERROR =
  "Login was successful, but this phone could not save the secure session. Please restart the app and try again.";

let cachedSessionId: string | null | undefined;
let cachedSessionVersion: string | null | undefined;
let cachedActiveDeviceId: string | null | undefined;

async function readSecureKey(key: string): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

async function readFallbackKey(key: string): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(`${FALLBACK_PREFIX}${key}`);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

async function readKey(key: string): Promise<string | null> {
  return (await readSecureKey(key)) ?? (await readFallbackKey(key));
}

async function writeSecureKey(key: string, value: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value);
    const readBack = await SecureStore.getItemAsync(key);
    return readBack === value;
  } catch {
    return false;
  }
}

async function writeFallbackKey(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(`${FALLBACK_PREFIX}${key}`, value);
    const readBack = await AsyncStorage.getItem(`${FALLBACK_PREFIX}${key}`);
    return readBack === value;
  } catch {
    return false;
  }
}

async function writeKey(key: string, value: string): Promise<boolean> {
  if (await writeSecureKey(key, value)) {
    return true;
  }
  return writeFallbackKey(key, value);
}

async function deleteKey(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
  await AsyncStorage.removeItem(`${FALLBACK_PREFIX}${key}`).catch(() => undefined);
}

function invalidateCache() {
  cachedSessionId = undefined;
  cachedSessionVersion = undefined;
  cachedActiveDeviceId = undefined;
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

export async function saveDeviceSessionId(sessionId: string): Promise<void> {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    throw new Error(DEVICE_SESSION_STORAGE_ERROR);
  }

  const saved = await writeKey(DEVICE_SESSION_KEY, trimmed);
  if (!saved) {
    throw new Error(DEVICE_SESSION_STORAGE_ERROR);
  }

  invalidateCache();
  cachedSessionId = trimmed;

  const verified = await verifyDeviceSessionSaved(trimmed);
  if (!verified) {
    throw new Error(DEVICE_SESSION_STORAGE_ERROR);
  }
}

export async function verifyDeviceSessionSaved(expectedId: string): Promise<boolean> {
  invalidateCache();
  const readBack = await readKey(DEVICE_SESSION_KEY);
  cachedSessionId = readBack;
  return readBack === expectedId.trim();
}

export async function saveSessionMetadata(options: {
  sessionVersion?: string | number | null;
  activeDeviceId?: string | null;
}) {
  if (options.sessionVersion != null && String(options.sessionVersion).trim()) {
    const value = String(options.sessionVersion).trim();
    if (await writeKey(SESSION_VERSION_KEY, value)) {
      cachedSessionVersion = value;
    }
  }
  if (options.activeDeviceId?.trim()) {
    const value = options.activeDeviceId.trim();
    if (await writeKey(ACTIVE_DEVICE_ID_KEY, value)) {
      cachedActiveDeviceId = value;
    }
  }
}

export async function clearDeviceSessionId() {
  cachedSessionId = null;
  cachedSessionVersion = null;
  cachedActiveDeviceId = null;
  await deleteKey(DEVICE_SESSION_KEY);
  await deleteKey(SESSION_VERSION_KEY);
  await deleteKey(ACTIVE_DEVICE_ID_KEY);
}
