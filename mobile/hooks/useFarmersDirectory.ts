import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOptionLabel } from "../../src/api/masters";
import { useConnectivityOnline } from "../../src/hooks/useConnectivityOnline";
import { useLanOnlyMode } from "../../src/hooks/useLanOnlyMode";
import { formatRelativeTimeLocalized } from "../../src/i18n";
import { useI18n } from "../../src/i18n/I18nContext";
import { useFieldDataRefresh } from "../../src/storage/FieldDataRefreshContext";
import { useMasterData } from "../../src/storage/MasterDataContext";
import { getCachedFarmers, readFarmersCache } from "../lib/farmersCache";
import {
  fetchMobileFarmersPage,
  syncAllFarmersToCache,
  type FarmersSyncProgress,
  type MobileFarmer
} from "../lib/farmersApi";
import { StorageKeys, storage, touchCacheTimestamp } from "../lib/storage";
import {
  buildFarmerDirectoryRows,
  countWorkQueueFarmers,
  paginateWorkQueueRows,
  WORK_SECTION_I18N,
  type FarmerWorkQueueRow,
  type FarmerWorkSectionId
} from "../lib/workQueue";

dayjs.extend(relativeTime);

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;
const SYNC_SUCCESS_MS = 3000;
const OFFLINE_TOAST_MS = 3000;
const END_REACHED_COOLDOWN_MS = 600;

function readFarmersCacheTimestamp(): string | null {
  const ttl = storage.getString(StorageKeys.FARMERS_CACHE_TTL);
  if (ttl) return ttl;
  return readFarmersCache()?.syncedAt ?? null;
}

function matchesVillage(farmer: MobileFarmer, villageId: string, villageName: string) {
  if (!villageId && !villageName) return true;
  if (villageId && String(farmer.village) === villageId) return true;
  const name = (farmer.village_name || "").trim().toLowerCase();
  return villageName ? name === villageName.trim().toLowerCase() : false;
}

function mergeFarmerRows(current: MobileFarmer[], rows: MobileFarmer[]) {
  if (rows.length === 0) return current;
  const byId = new Map(current.map((farmer) => [farmer.id, farmer]));
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

function matchesSearch(farmer: MobileFarmer, query: string) {
  if (!query) return true;
  const needle = query.toLowerCase();
  const name = (farmer.name || "").toLowerCase();
  const phone = (farmer.phone || "").toLowerCase();
  const village = String(farmer.village_name || farmer.village || "").toLowerCase();
  return name.includes(needle) || phone.includes(needle) || village.includes(needle);
}

export function useFarmersDirectory(
  sectionTitle: (sectionId: FarmerWorkSectionId, count: number) => string,
  emptyMessage: (sectionId: FarmerWorkSectionId) => string | null
) {
  const { t, language } = useI18n();
  const online = useConnectivityOnline();
  const lanOnly = useLanOnlyMode();
  const { villages } = useMasterData();
  const { farmersVersion } = useFieldDataRefresh();

  const localeOptions = useMemo(
    () => ({
      neverLabel: t("work.neverVisited"),
      locale: language === "ta" ? "ta-IN" : "en-IN"
    }),
    [language, t]
  );

  const farmersCountRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);
  const endReachedCooldownRef = useRef(false);
  const requestSeqRef = useRef(0);
  const syncInFlightRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [farmers, setFarmers] = useState<MobileFarmer[]>(() => {
    const cached = getCachedFarmers() as MobileFarmer[];
    return cached.slice(0, PAGE_SIZE);
  });
  const [cachedFarmers, setCachedFarmers] = useState<MobileFarmer[]>(() => getCachedFarmers() as MobileFarmer[]);
  const [totalCount, setTotalCount] = useState<number | null>(() => {
    const cached = getCachedFarmers();
    return cached.length > 0 ? cached.length : null;
  });
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [cacheWindow, setCacheWindow] = useState(PAGE_SIZE);
  const [isInitialLoading, setIsInitialLoading] = useState(() => getCachedFarmers().length === 0);
  const [loadError, setLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<FarmersSyncProgress | null>(null);
  const [syncCompleteMessage, setSyncCompleteMessage] = useState<string | null>(null);
  const [offlineToast, setOfflineToast] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => readFarmersCacheTimestamp());
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const isOffline = !online;
  const hasFullCache = cachedFarmers.length > 0;
  const useApiList = !isOffline;
  farmersCountRef.current = farmers.length;

  const villageLabel = useMemo(() => {
    if (selectedVillageName) return selectedVillageName;
    if (!selectedVillageId) return "";
    const match = villages.find((v) => String(v.id) === selectedVillageId);
    return match ? getOptionLabel(match) : "";
  }, [selectedVillageId, selectedVillageName, villages]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (offlineToastTimerRef.current) clearTimeout(offlineToastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setCacheWindow(PAGE_SIZE);
  }, [selectedVillageId, selectedVillageName, debouncedSearch, isOffline]);

  const refreshLastSyncedLabel = useCallback(() => {
    setLastSyncedAt(readFarmersCacheTimestamp());
  }, []);

  const fetchPageOne = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      if (!useApiList) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
        return;
      }

      const seq = ++requestSeqRef.current;
      const empty = farmersCountRef.current === 0;
      if (mode === "refresh") setIsRefreshing(true);
      if (empty && mode !== "silent") setIsInitialLoading(true);
      setLoadError(false);
      setLoadMoreError(false);

      try {
        const response = await fetchMobileFarmersPage({
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          village: villageLabel || undefined
        });
        if (seq !== requestSeqRef.current) return;

        const rows = response.results as MobileFarmer[];
        setFarmers(rows);
        setPage(1);
        setNextUrl(response.next);
        setHasNextPage(Boolean(response.next));
        setTotalCount(response.count ?? rows.length);
        setLoadError(false);
      } catch {
        if (seq !== requestSeqRef.current) return;
        setLoadError(true);
        const cached = getCachedFarmers() as MobileFarmer[];
        if (cached.length > 0) {
          const filtered = cached.filter((farmer) => {
            if (!matchesSearch(farmer, debouncedSearch)) return false;
            if (!matchesVillage(farmer, selectedVillageId, villageLabel)) return false;
            return true;
          });
          setFarmers(filtered.slice(0, PAGE_SIZE));
          setTotalCount(filtered.length);
          setHasNextPage(filtered.length > PAGE_SIZE);
        } else {
          setHasNextPage(false);
          setNextUrl(null);
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [debouncedSearch, selectedVillageId, useApiList, villageLabel]
  );

  const loadMore = useCallback(async () => {
    if (!useApiList || loadMoreInFlightRef.current || !hasNextPage || !nextUrl) return;

    loadMoreInFlightRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(false);
    const startedSeq = requestSeqRef.current;
    const nextPage = page + 1;

    try {
      const response = await fetchMobileFarmersPage({ nextUrl, pageSize: PAGE_SIZE });
      if (startedSeq !== requestSeqRef.current) return;

      const rows = response.results as MobileFarmer[];
      setFarmers((current) => mergeFarmerRows(current, rows));
      setPage(nextPage);
      setNextUrl(response.next);
      setHasNextPage(Boolean(response.next));
      if (response.count != null) setTotalCount(response.count);
    } catch {
      if (startedSeq !== requestSeqRef.current) return;
      setLoadMoreError(true);
    } finally {
      loadMoreInFlightRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasNextPage, nextUrl, page, useApiList]);

  useEffect(() => {
    if (!useApiList) {
      setIsInitialLoading(false);
      return;
    }
    void fetchPageOne("initial");
  }, [fetchPageOne, useApiList]);

  const sourceFarmers = useMemo(() => {
    if (useApiList) {
      // Server already applied search/village. Re-filtering by name/id mismatch empties the list.
      return farmers;
    }
    return cachedFarmers.filter((farmer) => {
      if (!matchesSearch(farmer, debouncedSearch)) return false;
      if (!matchesVillage(farmer, selectedVillageId, villageLabel)) return false;
      return true;
    });
  }, [cachedFarmers, debouncedSearch, farmers, selectedVillageId, useApiList, villageLabel]);

  const workQueueRows = useMemo(
    () =>
      buildFarmerDirectoryRows(sourceFarmers, new Date(), {
        sectionTitle,
        emptyMessage,
        localeOptions
      }),
    [emptyMessage, localeOptions, sectionTitle, sourceFarmers]
  );

  useEffect(() => {
    if (farmersVersion <= 0) return;
    if (useApiList) {
      void fetchPageOne("refresh");
    }
  }, [farmersVersion, fetchPageOne, useApiList]);

  const listData = useMemo(
    () => (useApiList ? workQueueRows : paginateWorkQueueRows(workQueueRows, cacheWindow)),
    [cacheWindow, useApiList, workQueueRows]
  );

  const hasMore = useApiList ? hasNextPage : cacheWindow < countWorkQueueFarmers(workQueueRows);

  const displayTotal = countWorkQueueFarmers(workQueueRows);

  const runFullSync = useCallback(async () => {
    if (!online) {
      setOfflineToast(true);
      if (offlineToastTimerRef.current) clearTimeout(offlineToastTimerRef.current);
      offlineToastTimerRef.current = setTimeout(() => setOfflineToast(false), OFFLINE_TOAST_MS);
      return;
    }
    if (syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    setSyncingAll(true);
    setSyncCompleteMessage(null);
    setSyncProgress({ current: 0, total: 1, loaded: 0, farmers: [] });

    try {
      const all = await syncAllFarmersToCache((progress) => setSyncProgress(progress));
      setCachedFarmers(all);
      touchCacheTimestamp(StorageKeys.FARMERS_CACHE_TTL);
      refreshLastSyncedLabel();
      setSyncCompleteMessage(t("farmers.syncedCount", { count: all.length }));
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSyncCompleteMessage(null), SYNC_SUCCESS_MS);

      if (useApiList && !debouncedSearch && !villageLabel) {
        await fetchPageOne("silent");
      }
    } finally {
      setSyncingAll(false);
      setSyncProgress(null);
      syncInFlightRef.current = false;
    }
  }, [debouncedSearch, fetchPageOne, online, refreshLastSyncedLabel, useApiList, villageLabel]);

  const onRefresh = useCallback(() => {
    if (!useApiList) {
      setCachedFarmers(getCachedFarmers() as MobileFarmer[]);
      setCacheWindow(PAGE_SIZE);
      refreshLastSyncedLabel();
      return;
    }
    void fetchPageOne("refresh");
  }, [fetchPageOne, refreshLastSyncedLabel, useApiList]);

  const onEndReached = useCallback(() => {
    if (endReachedCooldownRef.current) return;
    endReachedCooldownRef.current = true;
    setTimeout(() => {
      endReachedCooldownRef.current = false;
    }, END_REACHED_COOLDOWN_MS);

    if (useApiList) {
      if (hasNextPage) void loadMore();
      return;
    }
    if (cacheWindow < countWorkQueueFarmers(workQueueRows)) {
      setCacheWindow((size) => size + PAGE_SIZE);
    }
  }, [cacheWindow, hasNextPage, loadMore, useApiList, workQueueRows]);

  const clearVillage = useCallback(() => {
    setSelectedVillageId("");
    setSelectedVillageName("");
  }, []);

  const toggleSection = useCallback((_sectionId: FarmerWorkSectionId) => {
    // Sections stay expanded in directory mode.
  }, []);

  const directoryTotal = totalCount ?? cachedFarmers.length ?? sourceFarmers.length;

  const totalFarmersLabel = useMemo(() => {
    return t("farmers.totalFarmers", { count: directoryTotal });
  }, [directoryTotal, t]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncedAt) return t("farmers.notSyncedYet");
    const d = dayjs(lastSyncedAt);
    if (!d.isValid()) return t("farmers.notSyncedYet");
    if (d.isSame(dayjs(), "day")) return t("farmers.lastSyncToday");
    return t("farmers.lastSyncAgo", {
      time: formatRelativeTimeLocalized(language, lastSyncedAt)
    });
  }, [language, lastSyncedAt, t]);

  const subtitle = useMemo(() => {
    if (!lastSyncedAt) return `${directoryTotal} total · not synced`;
    const d = dayjs(lastSyncedAt);
    if (!d.isValid()) return `${directoryTotal} total · not synced`;
    if (d.isSame(dayjs(), "day")) return `${directoryTotal} total · synced today`;
    return `${directoryTotal} total · synced ${d.fromNow(true)} ago`;
  }, [directoryTotal, lastSyncedAt]);

  return {
    lanOnly,
    isOffline,
    hasFullCache,
    listData,
    workQueueRows,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    loadMoreError,
    loadError,
    syncingAll,
    syncProgress,
    syncCompleteMessage,
    offlineToast,
    searchQuery,
    setSearchQuery,
    villageLabel,
    selectedVillageId,
    setSelectedVillageId,
    setSelectedVillageName,
    clearVillage,
    displayTotal,
    sourceCount: sourceFarmers.length,
    directoryTotal,
    totalFarmersLabel,
    lastSyncLabel,
    subtitle,
    toggleSection,
    hasMore,
    onRefresh,
    onEndReached,
    retryLoadMore: loadMore,
    handleSyncAll: runFullSync,
    refreshLastSyncedLabel
  };
}

export type { FarmerWorkQueueRow };
