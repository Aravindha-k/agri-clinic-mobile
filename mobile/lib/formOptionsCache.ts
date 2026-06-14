import { appStorage } from "./mmkv";

export const FORM_OPTIONS_KEY = "form_options_v1";
const TTL_MS = 24 * 60 * 60 * 1000;

type CacheEnvelope<T> = {
  syncedAt: string;
  data: T;
};

export function readCachedFormOptions<T>(): T | null {
  try {
    const raw = appStorage.getString(FORM_OPTIONS_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    const age = Date.now() - new Date(envelope.syncedAt).getTime();
    if (Number.isNaN(age) || age > TTL_MS) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

export function readStaleFormOptions<T>(): T | null {
  try {
    const raw = appStorage.getString(FORM_OPTIONS_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    return envelope.data;
  } catch {
    return null;
  }
}

export function writeFormOptionsCache<T>(data: T): void {
  const envelope: CacheEnvelope<T> = {
    syncedAt: new Date().toISOString(),
    data
  };
  appStorage.set(FORM_OPTIONS_KEY, JSON.stringify(envelope));
}

export function cropProblemItemsKey(cropId: string | number) {
  return `problem_items_crop_${cropId}_v1`;
}

export function readCropProblemItemsCache(cropId: string | number) {
  try {
    const raw = appStorage.getString(cropProblemItemsKey(cropId));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<unknown[]>;
    const age = Date.now() - new Date(envelope.syncedAt).getTime();
    if (Number.isNaN(age) || age > TTL_MS) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

export function readStaleCropProblemItems(cropId: string | number) {
  try {
    const raw = appStorage.getString(cropProblemItemsKey(cropId));
    if (!raw) return null;
    return (JSON.parse(raw) as CacheEnvelope<unknown[]>).data;
  } catch {
    return null;
  }
}

export function writeCropProblemItemsCache(cropId: string | number, items: unknown[]) {
  const envelope: CacheEnvelope<unknown[]> = {
    syncedAt: new Date().toISOString(),
    data: items
  };
  appStorage.set(cropProblemItemsKey(cropId), JSON.stringify(envelope));
}

export function catalogProblemItemsKey(categoryCode: string, searchAll: boolean) {
  const code = categoryCode.trim().toLowerCase() || "all";
  return searchAll ? `problem_items_catalog_${code}_v1` : `problem_items_crop_cat_${code}_v1`;
}

export function readCatalogProblemItemsCache(categoryCode: string, searchAll: boolean) {
  try {
    const raw = appStorage.getString(catalogProblemItemsKey(categoryCode, searchAll));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<unknown[]>;
    const age = Date.now() - new Date(envelope.syncedAt).getTime();
    if (Number.isNaN(age) || age > TTL_MS) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

export function readStaleCatalogProblemItems(categoryCode: string, searchAll: boolean) {
  try {
    const raw = appStorage.getString(catalogProblemItemsKey(categoryCode, searchAll));
    if (!raw) return null;
    return (JSON.parse(raw) as CacheEnvelope<unknown[]>).data;
  } catch {
    return null;
  }
}

export function writeCatalogProblemItemsCache(
  categoryCode: string,
  searchAll: boolean,
  items: unknown[]
) {
  const envelope: CacheEnvelope<unknown[]> = {
    syncedAt: new Date().toISOString(),
    data: items
  };
  appStorage.set(catalogProblemItemsKey(categoryCode, searchAll), JSON.stringify(envelope));
}
