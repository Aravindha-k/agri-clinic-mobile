import AsyncStorage from "@react-native-async-storage/async-storage";

type StringStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete?: (key: string) => void;
};

function createAsyncStorageFallback(): StringStorage {
  const cache = new Map<string, string>();
  void AsyncStorage.getAllKeys()
    .then((keys) => AsyncStorage.multiGet(keys))
    .then((pairs) => {
      for (const [key, value] of pairs) {
        if (value != null) cache.set(key, value);
      }
    })
    .catch(() => undefined);

  return {
    getString(key) {
      return cache.get(key);
    },
    set(key, value) {
      cache.set(key, value);
      void AsyncStorage.setItem(key, value).catch(() => undefined);
    },
    delete(key) {
      cache.delete(key);
      void AsyncStorage.removeItem(key).catch(() => undefined);
    }
  };
}

function createMmkvStorage(): StringStorage {
  try {
    const { createMMKV } = require("react-native-mmkv") as typeof import("react-native-mmkv");
    const mmkv = createMMKV({ id: "agri-clinic-mobile" });
    return {
      getString: (key) => mmkv.getString(key),
      set: (key, value) => mmkv.set(key, value),
      delete: (key) => mmkv.remove(key)
    };
  } catch {
    return createAsyncStorageFallback();
  }
}

export const storage = createMmkvStorage();

export function getJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getString(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function setJson(key: string, value: unknown) {
  storage.set(key, JSON.stringify(value));
}

export function removeKey(key: string) {
  if (storage.delete) {
    storage.delete(key);
    return;
  }
  storage.set(key, "");
}

export const SYNC_STORAGE_KEYS = {
  pendingVisits: "pending_visits_v1",
  pendingGps: "pending_gps_v1"
} as const;

export const StorageKeys = {
  FARMERS_CACHE_TTL: "farmers_cache_ttl_v1"
} as const;

/** True when the stored ISO timestamp is older than `maxAgeHours`. */
export function isExpired(key: string, maxAgeHours: number): boolean {
  const raw = storage.getString(key);
  if (!raw) return true;
  const ts = new Date(raw).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > maxAgeHours * 60 * 60 * 1000;
}

export function touchCacheTimestamp(key: string, at = new Date()) {
  storage.set(key, at.toISOString());
}

const MANAGED_KEYS = [
  SYNC_STORAGE_KEYS.pendingVisits,
  SYNC_STORAGE_KEYS.pendingGps,
  "last_gps_sync_v1",
  "farmers_cache_v1",
  "form_options_v1",
  "dashboard_cache_v1"
];

export function clearAppStorage() {
  for (const key of MANAGED_KEYS) {
    removeKey(key);
  }
}

/** @deprecated Use `storage` from lib/storage.ts */
export const appStorage = storage;
