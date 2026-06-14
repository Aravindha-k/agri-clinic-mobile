import AsyncStorage from "@react-native-async-storage/async-storage";
import { Farmer, fetchFarmersPage, getAllFarmers } from "../api/farmers";
import { getCrops, getDistricts, getVillages, MasterOption } from "../api/masters";
import { getProblemCategories, ProblemCategory } from "../api/problems";
import { isNetworkError } from "../utils/apiError";

const CACHE_KEY = "@agri/master_data_v2";
export const MASTER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const OFFLINE_FARMERS_PAGE_SIZE = 50;

export type MasterDataSnapshot = {
  syncedAt: string;
  districts: MasterOption[];
  villages: MasterOption[];
  crops: MasterOption[];
  problemCategories: ProblemCategory[];
  /** First page of farmers for lightweight offline hints — not the full directory. */
  offlineFarmers: Farmer[];
  farmersSyncedAt?: string | null;
};

export async function readMasterDataCache(): Promise<MasterDataSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MasterDataSnapshot;
    if (!parsed?.syncedAt) return null;
    return {
      ...parsed,
      problemCategories: parsed.problemCategories ?? [],
      offlineFarmers: parsed.offlineFarmers ?? []
    };
  } catch {
    return null;
  }
}

export async function writeMasterDataCache(snapshot: MasterDataSnapshot): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
}

export async function clearMasterDataCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
}

export function isMasterCacheFresh(syncedAt: string | null | undefined): boolean {
  if (!syncedAt) return false;
  const t = new Date(syncedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < MASTER_CACHE_TTL_MS;
}

export type MasterSyncResult =
  | { ok: true; snapshot: MasterDataSnapshot; fromCache?: boolean }
  | { ok: false; error: unknown; cached: MasterDataSnapshot | null };

/** Pull core master lists (no full farmer/problem-item catalogs). Never throws. */
export async function syncMasterDataFromApi(options?: { force?: boolean }): Promise<MasterSyncResult> {
  const cached = await readMasterDataCache();
  if (!options?.force && cached && isMasterCacheFresh(cached.syncedAt)) {
    return { ok: true, snapshot: cached, fromCache: true };
  }

  try {
    const [districts, villages, crops, problemCategories, farmerPage] = await Promise.all([
      getDistricts(),
      getVillages(),
      getCrops(),
      getProblemCategories(),
      fetchFarmersPage({ page: 1, pageSize: OFFLINE_FARMERS_PAGE_SIZE, source: "masterDataCache" })
    ]);
    const snapshot: MasterDataSnapshot = {
      syncedAt: new Date().toISOString(),
      districts,
      villages,
      crops,
      problemCategories,
      offlineFarmers: farmerPage.results.filter((f) => f.is_active !== false),
      farmersSyncedAt: null
    };
    await writeMasterDataCache(snapshot);
    return { ok: true, snapshot };
  } catch (error) {
    return { ok: false, error, cached };
  }
}

/** Manual offline sync — full farmer directory (user-initiated only). */
export async function syncAllFarmersForOffline(): Promise<{ farmers: Farmer[]; snapshot: MasterDataSnapshot }> {
  const farmers = await getAllFarmers();
  const active = farmers.filter((f) => f.is_active !== false);
  const cached = (await readMasterDataCache()) ?? {
    syncedAt: new Date().toISOString(),
    districts: [],
    villages: [],
    crops: [],
    problemCategories: [],
    offlineFarmers: []
  };
  const snapshot: MasterDataSnapshot = {
    ...cached,
    offlineFarmers: active,
    farmersSyncedAt: new Date().toISOString()
  };
  await writeMasterDataCache(snapshot);
  return { farmers: active, snapshot };
}

export function formatMasterSyncWarning(syncedAt: string | null | undefined): string | null {
  if (!syncedAt) return null;
  const date = new Date(syncedAt);
  if (Number.isNaN(date.getTime())) return null;
  const when = date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  return `Master lists cached · last updated ${when}. Tap to refresh.`;
}

export function isMasterSyncNetworkFailure(error: unknown) {
  return isNetworkError(error);
}
