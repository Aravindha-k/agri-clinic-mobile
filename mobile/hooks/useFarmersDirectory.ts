import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOptionLabel } from "../../src/api/masters";
import { useConnectivityOnline } from "../../src/hooks/useConnectivityOnline";
import { useLanOnlyMode } from "../../src/hooks/useLanOnlyMode";
import { useI18n } from "../../src/i18n/I18nContext";
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
  buildFarmerWorkQueueRows,
  countWorkQueueFarmers,
  paginateWorkQueueRows,
  WORK_SECTION_I18N,
  type FarmerWorkQueueRow,
  type FarmerWorkSectionId
} from "../lib/workQueue";

dayjs.extend(relativeTime);

const PAGE_SIZE = 100;
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

function requestKey(search: string, village: string, page: number) {
  return `${search}|${village}|${page}`;
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
  const { t } = useI18n();
  const online = useConnectivityOnline();
  const lanOnly = useLanOnlyMode();
  const { villages } = useMasterData();

  const isFetchingRef = useRef(false);
  const lastRequestKeyRef = useRef("");
  const endReachedCooldownRef = useRef(false);
  const requestSeqRef = useRef(0);
  const syncInFlightRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [farmers, setFarmers] = useState<MobileFarmer[]>([]);
  const [cachedFarmers, setCachedFarmers] = useState<MobileFarmer[]>(() => getCachedFarmers() as MobileFarmer[]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [cacheWindow, setCacheWindow] = useState(PAGE_SIZE);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<FarmersSyncProgress | null>(null);
  const [syncCompleteMessage, setSyncCompleteMessage] = useState<string | null>(null);
  const [offlineToast, setOfflineToast] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => readFarmersCacheTimestamp());
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<ReadonlySet<FarmerWorkSectionId>>(
    () => new Set(["all_farmers"])
  );

  const isOffline = !online;
  const hasFullCache = cachedFarmers.length > 0;
  const useApiList = !isOffline;

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
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setCacheWindow(PAGE_SIZE);
    lastRequestKeyRef.current = "";
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

      const key = requestKey(debouncedSearch, villageLabel, 1);
      if (mode !== "refresh" && lastRequestKeyRef.current === key && farmers.length > 0) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (isFetchingRef.current) return;

      const seq = ++requestSeqRef.current;
      isFetchingRef.current = true;
      lastRequestKeyRef.current = key;

      if (mode === "initial" && farmers.length === 0) setIsInitialLoading(true);
      if (mode === "refresh") setIsRefreshing(true);

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
      } catch {
        if (seq !== requestSeqRef.current) return;
        setHasNextPage(false);
        setNextUrl(null);
      } finally {
        if (seq === requestSeqRef.current) {
          isFetchingRef.current = false;
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [debouncedSearch, farmers.length, useApiList, villageLabel]
  );

  const loadMore = useCallback(async () => {
    if (!useApiList || isLoadingMore || isFetchingRef.current || !hasNextPage || !nextUrl) return;

    isFetchingRef.current = true;
    setIsLoadingMore(true);
    const seq = ++requestSeqRef.current;
    const nextPage = page + 1;

    try {
      const response = await fetchMobileFarmersPage({ nextUrl, pageSize: PAGE_SIZE });
      if (seq !== requestSeqRef.current) return;

      const rows = response.results as MobileFarmer[];
      setFarmers((current) => mergeFarmerRows(current, rows));
      setPage(nextPage);
      setNextUrl(response.next);
      setHasNextPage(Boolean(response.next));
      if (response.count != null) setTotalCount(response.count);
    } catch {
      setHasNextPage(false);
      setNextUrl(null);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasNextPage, isLoadingMore, nextUrl, page, useApiList]);

  useEffect(() => {
    if (!useApiList) {
      setIsInitialLoading(false);
      return;
    }
    void fetchPageOne("initial");
  }, [fetchPageOne, useApiList]);

  const sourceFarmers = useMemo(() => {
    const pool = useApiList ? farmers : cachedFarmers;
    return pool.filter((farmer) => {
      if (!matchesSearch(farmer, debouncedSearch)) return false;
      if (!matchesVillage(farmer, selectedVillageId, villageLabel)) return false;
      return true;
    });
  }, [cachedFarmers, debouncedSearch, farmers, selectedVillageId, useApiList, villageLabel]);

  const workQueueRows = useMemo(
    () =>
      buildFarmerWorkQueueRows(sourceFarmers, new Date(), {
        sectionTitle,
        emptyMessage,
        collapsedSections
      }),
    [collapsedSections, emptyMessage, sectionTitle, sourceFarmers]
  );

  const listData = useMemo(
    () => paginateWorkQueueRows(workQueueRows, cacheWindow),
    [cacheWindow, workQueueRows]
  );

  const hasMore =
    useApiList && hasNextPage
      ? true
      : cacheWindow < countWorkQueueFarmers(workQueueRows);

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
      setSyncCompleteMessage(`✓ ${all.length} farmers synced`);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSyncCompleteMessage(null), SYNC_SUCCESS_MS);

      if (useApiList && !debouncedSearch && !villageLabel) {
        lastRequestKeyRef.current = "";
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
    lastRequestKeyRef.current = "";
    void fetchPageOne("refresh");
  }, [fetchPageOne, refreshLastSyncedLabel, useApiList]);

  const onEndReached = useCallback(() => {
    if (endReachedCooldownRef.current) return;
    endReachedCooldownRef.current = true;
    setTimeout(() => {
      endReachedCooldownRef.current = false;
    }, END_REACHED_COOLDOWN_MS);

    if (useApiList && hasNextPage) {
      void loadMore();
    }
    if (cacheWindow < countWorkQueueFarmers(workQueueRows)) {
      setCacheWindow((size) => size + PAGE_SIZE);
    }
  }, [cacheWindow, hasNextPage, loadMore, useApiList, workQueueRows]);

  const clearVillage = useCallback(() => {
    setSelectedVillageId("");
    setSelectedVillageName("");
  }, []);

  const toggleSection = useCallback((sectionId: FarmerWorkSectionId) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const directoryTotal = totalCount ?? sourceFarmers.length;

  const totalFarmersLabel = useMemo(() => {
    return t("farmers.totalFarmers", { count: directoryTotal });
  }, [directoryTotal, t]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncedAt) return t("farmers.notSyncedYet");
    const d = dayjs(lastSyncedAt);
    if (!d.isValid()) return t("farmers.notSyncedYet");
    if (d.isSame(dayjs(), "day")) return t("farmers.lastSyncToday");
    return t("farmers.lastSyncAgo", { time: d.fromNow() });
  }, [lastSyncedAt, t]);

  const subtitle = useMemo(() => {
    if (!lastSyncedAt) return `${displayTotal} total · not synced`;
    const d = dayjs(lastSyncedAt);
    if (!d.isValid()) return `${displayTotal} total · not synced`;
    if (d.isSame(dayjs(), "day")) return `${displayTotal} total · synced today`;
    return `${displayTotal} total · synced ${d.fromNow(true)} ago`;
  }, [displayTotal, lastSyncedAt]);

  return {
    lanOnly,
    isOffline,
    hasFullCache,
    listData,
    workQueueRows,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
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
    directoryTotal,
    totalFarmersLabel,
    lastSyncLabel,
    subtitle,
    collapsedSections,
    toggleSection,
    hasMore,
    onRefresh,
    onEndReached,
    handleSyncAll: runFullSync,
    refreshLastSyncedLabel
  };
}

export type { FarmerWorkQueueRow };
