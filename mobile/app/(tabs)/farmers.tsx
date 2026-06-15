import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { FilterPillRow } from "../../components/FilterPillRow";
import { KavyaLoader } from "../../components/KavyaLoader";
import { CascadeIn } from "../../../src/components/ui/CascadeIn";
import { NeonProgressBar } from "../../../src/components/cinematic";
import { ScreenBackground } from "../../../src/components/glass";
import { SkeletonCard } from "../../../src/components/ui/SkeletonCard";
import { SectionLabel } from "../../components/SectionLabel";
import { BrandLogo } from "../../../src/components/brand/BrandLogo";
import { LOGO_IMAGE } from "../../../src/config/brand";
import { getOptionLabel } from "../../../src/api/masters";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useLanOnlyMode } from "../../../src/hooks/useLanOnlyMode";
import { LAN_OFFLINE_BANNER_MESSAGE } from "../../lib/api";
import { useGpsWorkGuard } from "../../../src/hooks/useGpsWorkGuard";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { navigateFarmerMap } from "../../../src/navigation/navigateFarmerMap";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { prefillFromFarmer } from "../../../src/utils/farmerPrefill";
import { FarmerDirectoryCard } from "../../components/farmers/FarmerDirectoryCard";
import { VillageFilterSheet, type VillageFilterSheetRef } from "../../components/farmers/VillageFilterSheet";
import { OfflineBanner } from "../../components/ui";
import { farmersDebug } from "../../lib/farmersDebug";
import { getCachedFarmers, readFarmersCache } from "../../lib/farmersCache";
import {
  fetchMobileFarmersPage,
  syncAllFarmersToCache,
  type FarmersSyncProgress,
  type MobileFarmer
} from "../../lib/farmersApi";
import { StorageKeys, storage, touchCacheTimestamp } from "../../lib/storage";
import { FarmerListFilter, filterCachedFarmers, matchesFarmerFilter } from "../../lib/farmerStatus";
import {
  buildFarmerWorkQueueRows,
  countWorkQueueFarmers,
  paginateWorkQueueRows,
  type FarmerWorkQueueRow
} from "../../lib/workQueue";
import { DS } from "../../../src/theme/globalStyles";
import { ENT, ENT_CARD_SHADOW } from "../../../src/theme/enterprise";
import { BRAND_COLORS } from "../../../src/config/brand";
dayjs.extend(relativeTime);

function formatHeaderSubtitle(count: number, iso: string | null): string {
  if (!iso) return `${count} total · not synced`;
  const d = dayjs(iso);
  if (!d.isValid()) return `${count} total · not synced`;
  if (d.isSame(dayjs(), "day")) return `${count} total · synced today`;
  return `${count} total · synced ${d.fromNow(true)} ago`;
}

function LogoWatermark({ size = 48, opacity = 0.1 }: { size?: number; opacity?: number }) {
  if (!LOGO_IMAGE) return <BrandLogo variant="watermark" width={size} height={size} />;
  return (
    <Image
      source={LOGO_IMAGE}
      style={{ width: size, height: size, opacity, borderRadius: 8 }}
      resizeMode="contain"
    />
  );
}

function FarmersEmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <LogoWatermark size={48} opacity={0.1} />
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

const PAGE_SIZE = 100;
const ROW_ESTIMATE = 168;
const SECTION_ROW_ESTIMATE = 32;
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

function requestKey(filter: FarmerListFilter, search: string, village: string, page: number) {
  return `${filter}|${search}|${village}|${page}`;
}

export default function FarmersTabScreen() {
  useSecureScreen();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const online = useConnectivityOnline();
  const lanOnly = useLanOnlyMode();
  const { canRunWorkAction } = useGpsWorkGuard();
  const { villages } = useMasterData();
  const { syncAll, lastSyncAt } = useOfflineSync();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const villageSheetRef = useRef<VillageFilterSheetRef>(null);

  const isFetchingRef = useRef(false);
  const lastRequestKeyRef = useRef("");
  const endReachedCooldownRef = useRef(false);
  const requestSeqRef = useRef(0);
  const syncInFlightRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderCountRef = useRef(0);

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
  const [quickFilter, setQuickFilter] = useState<FarmerListFilter>("all");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const filterChips = useMemo(
    (): { id: FarmerListFilter | "village"; label: string }[] => [
      { id: "all", label: t("farmers.all") },
      { id: "recently_visited", label: t("farmers.recentlyVisited") },
      { id: "not_visited", label: t("farmers.notVisited") },
      { id: "village", label: t("farmers.village") }
    ],
    [t]
  );

  const rootNav = navigation.getParent()?.getParent();
  const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : null;
  const isOffline = !online;

  const villageLabel = useMemo(() => {
    if (selectedVillageName) return selectedVillageName;
    if (!selectedVillageId) return "";
    const match = villages.find((v) => String(v.id) === selectedVillageId);
    return match ? getOptionLabel(match) : "";
  }, [selectedVillageId, selectedVillageName, villages]);

  const hasFullCache = cachedFarmers.length > 0;
  const isStatusFilter = quickFilter !== "all";
  const useApiList = !isOffline;
  const needsCacheForFilter = isStatusFilter && !hasFullCache && isOffline;
  const useCacheList = isOffline || (isStatusFilter && hasFullCache);
  const showWorkQueueSections =
    quickFilter === "all" && !debouncedSearch && !villageLabel && !needsCacheForFilter;

  renderCountRef.current += 1;
  if (__DEV__ && renderCountRef.current <= 5) {
    farmersDebug("render", {
      renderCount: renderCountRef.current,
      rows: farmers.length,
      useApiList,
      useCacheList,
      search: debouncedSearch,
      village: villageLabel,
      filter: quickFilter
    });
  }

  useEffect(() => {
    farmersDebug("mounted");
    return () => {
      farmersDebug("unmounted");
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (offlineToastTimerRef.current) clearTimeout(offlineToastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      farmersDebug("search debounced", { search: searchQuery.trim() });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setCacheWindow(PAGE_SIZE);
    lastRequestKeyRef.current = "";
  }, [quickFilter, selectedVillageId, selectedVillageName, debouncedSearch, isOffline]);

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

      const key = requestKey(quickFilter, debouncedSearch, villageLabel, 1);
      if (mode !== "refresh" && lastRequestKeyRef.current === key && farmers.length > 0) {
        farmersDebug("skip duplicate page 1", { key });
        setIsInitialLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (isFetchingRef.current) {
        farmersDebug("skip page 1 — fetch in flight");
        return;
      }

      const seq = ++requestSeqRef.current;
      isFetchingRef.current = true;
      lastRequestKeyRef.current = key;

      if (mode === "initial" && farmers.length === 0) {
        setIsInitialLoading(true);
      }
      if (mode === "refresh") {
        setIsRefreshing(true);
      }

      farmersDebug("fetch page 1", { search: debouncedSearch, village: villageLabel });

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

        farmersDebug("page 1 loaded", {
          count: rows.length,
          total: response.count,
          hasNext: Boolean(response.next)
        });
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        farmersDebug("page 1 failed", { error: err instanceof Error ? err.message : "unknown" });
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
    [debouncedSearch, farmers.length, quickFilter, useApiList, villageLabel]
  );

  const loadMore = useCallback(async () => {
    if (!useApiList || isLoadingMore || isFetchingRef.current || !hasNextPage || !nextUrl) {
      farmersDebug("loadMore skipped", {
        useApiList,
        isLoadingMore,
        isFetching: isFetchingRef.current,
        hasNextPage,
        hasNextUrl: Boolean(nextUrl)
      });
      return;
    }

    isFetchingRef.current = true;
    setIsLoadingMore(true);
    const seq = ++requestSeqRef.current;
    const nextPage = page + 1;

    farmersDebug("onEndReached → fetch next page", { page: nextPage });

    try {
      const response = await fetchMobileFarmersPage({ nextUrl, pageSize: PAGE_SIZE });
      if (seq !== requestSeqRef.current) return;

      const rows = response.results as MobileFarmer[];
      setFarmers((current) => mergeFarmerRows(current, rows));
      setPage(nextPage);
      setNextUrl(response.next);
      setHasNextPage(Boolean(response.next));
      if (response.count != null) setTotalCount(response.count);

      farmersDebug("page loaded", {
        page: nextPage,
        added: rows.length,
        totalRows: farmers.length + rows.length,
        hasNext: Boolean(response.next)
      });
    } catch (err) {
      farmersDebug("loadMore failed", { error: err instanceof Error ? err.message : "unknown" });
      setHasNextPage(false);
      setNextUrl(null);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [farmers.length, hasNextPage, isLoadingMore, nextUrl, page, useApiList]);

  const loadMoreFromCache = useCallback(() => {
    if (!useCacheList || isLoadingMore) return;
    setIsLoadingMore(true);
    setCacheWindow((size) => size + PAGE_SIZE);
    farmersDebug("cache window expanded", { nextWindow: cacheWindow + PAGE_SIZE });
    setIsLoadingMore(false);
  }, [cacheWindow, isLoadingMore, useCacheList]);

  useEffect(() => {
    if (useCacheList) {
      setIsInitialLoading(false);
      farmersDebug("cache list mode", { cached: cachedFarmers.length, filter: quickFilter });
      return;
    }
    void fetchPageOne("initial");
  }, [fetchPageOne, useCacheList]);

  useFocusEffect(
    useCallback(() => {
      refreshLastSyncedLabel();
    }, [refreshLastSyncedLabel])
  );

  const filteredCacheRows = useMemo(() => {
    if (!useCacheList) return [];

    const filter = isStatusFilter ? quickFilter : "all";
    return filterCachedFarmers(cachedFarmers, filter, {
      villageId: selectedVillageId,
      villageName: villageLabel,
      searchQuery: debouncedSearch,
      matchesVillage
    });
  }, [
    cachedFarmers,
    debouncedSearch,
    isStatusFilter,
    quickFilter,
    selectedVillageId,
    useCacheList,
    villageLabel
  ]);

  const filteredApiRows = useMemo(() => {
    if (!useApiList || useCacheList) return farmers;
    return farmers.filter((farmer) => {
      if (!matchesFarmerFilter(farmer, quickFilter)) return false;
      if (!matchesVillage(farmer, selectedVillageId, villageLabel)) return false;
      return true;
    });
  }, [farmers, quickFilter, selectedVillageId, useApiList, useCacheList, villageLabel]);

  const sourceFarmers = useMemo(() => {
    if (needsCacheForFilter) return [];
    if (useCacheList) return filteredCacheRows;
    return filteredApiRows;
  }, [filteredApiRows, filteredCacheRows, needsCacheForFilter, useCacheList]);

  const workQueueRows = useMemo(() => {
    if (!showWorkQueueSections) return null;
    return buildFarmerWorkQueueRows(sourceFarmers);
  }, [showWorkQueueSections, sourceFarmers]);

  const listData = useMemo((): MobileFarmer[] | FarmerWorkQueueRow[] => {
    if (needsCacheForFilter) return [];
    if (showWorkQueueSections && workQueueRows) {
      return paginateWorkQueueRows(workQueueRows, cacheWindow);
    }
    if (useCacheList) return filteredCacheRows.slice(0, cacheWindow);
    return filteredApiRows;
  }, [
    cacheWindow,
    filteredApiRows,
    filteredCacheRows,
    needsCacheForFilter,
    showWorkQueueSections,
    useCacheList,
    workQueueRows
  ]);

  const hasMore =
    useApiList && !useCacheList && hasNextPage
      ? true
      : showWorkQueueSections && workQueueRows
        ? cacheWindow < countWorkQueueFarmers(workQueueRows)
        : useCacheList
          ? cacheWindow < filteredCacheRows.length
          : false;

  const displayTotal = useCacheList
    ? filteredCacheRows.length
    : showWorkQueueSections && workQueueRows
      ? countWorkQueueFarmers(workQueueRows)
      : totalCount ?? filteredApiRows.length;

  const runFullSync = useCallback(async () => {
    if (!online) {
      setOfflineToast(true);
      if (offlineToastTimerRef.current) clearTimeout(offlineToastTimerRef.current);
      offlineToastTimerRef.current = setTimeout(() => setOfflineToast(false), OFFLINE_TOAST_MS);
      return;
    }
    if (syncInFlightRef.current) return;

    farmersDebug("sync started");
    syncInFlightRef.current = true;
    setSyncingAll(true);
    setSyncCompleteMessage(null);
    setSyncProgress({ current: 0, total: 1, loaded: 0, farmers: [] });

    try {
      const all = await syncAllFarmersToCache((progress) => {
        setSyncProgress(progress);
      });

      setCachedFarmers(all);
      touchCacheTimestamp(StorageKeys.FARMERS_CACHE_TTL);
      refreshLastSyncedLabel();

      setSyncCompleteMessage(`✓ ${all.length} farmers synced`);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSyncCompleteMessage(null), SYNC_SUCCESS_MS);

      farmersDebug("sync stopped", { total: all.length });

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

  const handleSyncAll = useCallback(() => {
    void runFullSync();
  }, [runFullSync]);

  const handleFilterPress = useCallback((id: FarmerListFilter | "village") => {
    if (id === "village") {
      villageSheetRef.current?.open();
      return;
    }
    farmersDebug("filter changed", { filter: id });
    setQuickFilter(id);
  }, []);

  const clearVillage = useCallback(() => {
    farmersDebug("village cleared");
    setSelectedVillageId("");
    setSelectedVillageName("");
  }, []);

  const onRefresh = useCallback(() => {
    if (useCacheList) {
      const cache = getCachedFarmers() as MobileFarmer[];
      setCachedFarmers(cache);
      setCacheWindow(PAGE_SIZE);
      return;
    }
    lastRequestKeyRef.current = "";
    void fetchPageOne("refresh");
  }, [fetchPageOne, useCacheList]);

  const onEndReached = useCallback(() => {
    if (endReachedCooldownRef.current) return;
    endReachedCooldownRef.current = true;
    setTimeout(() => {
      endReachedCooldownRef.current = false;
    }, END_REACHED_COOLDOWN_MS);

    if (showWorkQueueSections) {
      if (useApiList && !useCacheList && hasNextPage) {
        void loadMore();
      }
      if (workQueueRows && cacheWindow < countWorkQueueFarmers(workQueueRows)) {
        setCacheWindow((size) => size + PAGE_SIZE);
      }
      return;
    }

    if (useApiList && !useCacheList) {
      void loadMore();
      return;
    }
    if (useCacheList && cacheWindow < filteredCacheRows.length) {
      loadMoreFromCache();
    }
  }, [
    cacheWindow,
    filteredCacheRows.length,
    hasNextPage,
    loadMore,
    loadMoreFromCache,
    showWorkQueueSections,
    useApiList,
    useCacheList,
    workQueueRows
  ]);

  const keyExtractor = useCallback((item: MobileFarmer | FarmerWorkQueueRow) => {
    if ("type" in item) return item.id;
    return String(item.id);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: MobileFarmer | FarmerWorkQueueRow; index: number }) => {
      if ("type" in item) {
        if (item.type === "section") {
          return (
            <SectionLabel title={item.title} />
          );
        }
        return (
          <CascadeIn index={index % 6}>
            <FarmerDirectoryCard
            farmer={item.farmer}
            workflow={item.workflow}
            onPress={() => navigation.navigate("FarmerDetail", { id: item.farmer.id })}
            onMap={() =>
              navigateFarmerMap(navigation, {
                farmerId: item.farmer.id,
                farmerName: item.farmer.name,
                village: String(item.farmer.village_name || item.farmer.village || ""),
                latitude: item.farmer.latitude,
                longitude: item.farmer.longitude
              })
            }
            onVisit={() => {
              if (!canRunWorkAction()) return;
              rootNav?.navigate("VisitFlow", {
                screen: "NewVisitFarmer",
                params: { prefill: prefillFromFarmer(item.farmer), fastRevisit: true }
              });
            }}
          />
          </CascadeIn>
        );
      }

      return (
        <CascadeIn index={index % 6}>
        <FarmerDirectoryCard
          farmer={item}
          onPress={() => navigation.navigate("FarmerDetail", { id: item.id })}
          onMap={() =>
            navigateFarmerMap(navigation, {
              farmerId: item.id,
              farmerName: item.name,
              village: String(item.village_name || item.village || ""),
              latitude: item.latitude,
              longitude: item.longitude
            })
          }
          onVisit={() => {
            if (!canRunWorkAction()) return;
            rootNav?.navigate("VisitFlow", {
              screen: "NewVisitFarmer",
              params: { prefill: prefillFromFarmer(item), fastRevisit: true }
            });
          }}
        />
        </CascadeIn>
      );
    },
    [canRunWorkAction, navigation, rootNav]
  );

  const ListEmptyComponent = useMemo(
    () =>
      isInitialLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} height={110} />
          ))}
        </View>
      ) : (
        <FarmersEmptyState
          message={
            searchQuery.trim() || villageLabel || quickFilter !== "all"
              ? t("farmers.tryDifferentSearch")
              : t("farmers.noFarmers")
          }
        />
      ),
    [isInitialLoading, quickFilter, searchQuery, t, villageLabel]
  );

  const ListFooterComponent = useMemo(
    () =>
      isLoadingMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={DS.accent} />
          <Text style={styles.footerLoaderText}>Loading more farmers…</Text>
        </View>
      ) : null,
    [isLoadingMore]
  );

  const syncBtnLabel = syncCompleteMessage
    ? syncCompleteMessage
    : syncingAll && syncProgress
      ? `${syncProgress.current}/${syncProgress.total}`
      : "Sync";

  return (
    <View style={[styles.screen, { paddingTop: safeTop }]}>
      <ScreenBackground />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{t("farmers.title")}</Text>
            <Text style={styles.subtitle}>{formatHeaderSubtitle(displayTotal, lastSyncedAt)}</Text>
          </View>
          <Pressable
            onPress={handleSyncAll}
            disabled={syncingAll}
            style={({ pressed }) => [
              styles.syncBtn,
              syncingAll && styles.syncBtnDisabled,
              pressed && !syncingAll && { opacity: 0.88 }
            ]}
          >
            {syncingAll ? (
              <ActivityIndicator size={13} color="#fff" />
            ) : (
              <Ionicons name="refresh" size={13} color="#fff" />
            )}
            <Text style={styles.syncBtnText} numberOfLines={1}>
              {syncBtnLabel}
            </Text>
          </Pressable>
        </View>

        {syncingAll && syncProgress ? (
          <NeonProgressBar
            progress={syncProgress.current / Math.max(syncProgress.total, 1)}
            height={3}
            style={styles.progressTrack}
          />
        ) : null}

        {offlineToast ? (
          <View style={styles.offlineToast}>
            <Ionicons
              name={lanOnly ? "warning-outline" : "cloud-offline-outline"}
              size={16}
              color="#b45309"
            />
            <Text style={styles.offlineToastText}>
              {lanOnly ? LAN_OFFLINE_BANNER_MESSAGE : t("farmers.connectToSync")}
            </Text>
          </View>
        ) : null}

        {isOffline ? (
          <OfflineBanner
            pendingCount={0}
            lastSyncedAt={lastSyncDate}
            onSync={() => void syncAll()}
            offline
            lanOnly={lanOnly}
          />
        ) : null}
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={DS.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("farmers.searchPlaceholder")}
          placeholderTextColor="#cbd5e1"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <FilterPillRow
        pills={filterChips.map((chip) => {
          if (chip.id === "village") {
            const active = Boolean(villageLabel);
            return {
              id: "village",
              label: villageLabel || chip.label,
              active,
              onPress: () => {
                if (villageLabel) clearVillage();
                else handleFilterPress("village");
              }
            };
          }
          return {
            id: chip.id,
            label: chip.label,
            active: quickFilter === chip.id,
            onPress: () => handleFilterPress(chip.id)
          };
        })}
      />

      {needsCacheForFilter ? (
        <View style={styles.cacheRequiredBanner}>
          <Text style={styles.cacheRequiredText}>Sync all farmers first to use this filter offline</Text>
          <Pressable onPress={handleSyncAll} style={styles.cacheRequiredBtn}>
            <Text style={styles.cacheRequiredBtnText}>Sync now</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.listShell}>
        <FlashList
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          // @ts-expect-error FlashList v2 runtime supports item size hints
          estimatedItemSize={ROW_ESTIMATE}
          drawDistance={ROW_ESTIMATE * 6}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: tabInset + 16 }}
          keyboardShouldPersistTaps="handled"
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} {...refreshControlProps} />
          }
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
        />
      </View>

      <VillageFilterSheet
        ref={villageSheetRef}
        villages={villages}
        onSelect={(id, name) => {
          farmersDebug("village selected", { id, name });
          setSelectedVillageId(id);
          setSelectedVillageName(name);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: ENT.bg,
    flex: 1
  },
  listShell: {
    flex: 1,
    minHeight: 0
  },
  list: {
    flex: 1
  },
  header: {
    backgroundColor: ENT.card,
    borderBottomColor: ENT.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 16
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  titleBlock: {
    flex: 1,
    gap: 2,
    marginRight: 12
  },
  title: {
    color: ENT.text,
    fontSize: 22,
    fontWeight: "800"
  },
  subtitle: {
    color: ENT.textSecondary,
    fontSize: 10,
    marginTop: 2
  },
  syncBtn: {
    alignItems: "center",
    backgroundColor: ENT.bg,
    borderColor: ENT.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  syncBtnDisabled: {
    opacity: 0.65
  },
  syncBtnText: {
    color: ENT.textSecondary,
    fontSize: 9.5,
    fontWeight: "700",
    maxWidth: 120
  },
  progressTrack: {
    backgroundColor: BRAND_COLORS.primarySoft,
    borderRadius: 99,
    height: 3,
    overflow: "hidden",
    width: "100%"
  },
  progressFill: {
    backgroundColor: DS.accent,
    height: 3
  },
  offlineToast: {
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  offlineToastText: {
    color: "#b45309",
    flex: 1,
    fontSize: 12,
    fontWeight: "500"
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: ENT.card,
    borderColor: ENT.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    height: 44,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14
  },
  searchInput: {
    color: DS.textPrimary,
    flex: 1,
    fontSize: 13,
    paddingVertical: 0
  },
  cacheRequiredBanner: {
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  cacheRequiredText: {
    color: "#b45309",
    flex: 1,
    fontSize: 12,
    fontWeight: "500"
  },
  cacheRequiredBtn: {
    backgroundColor: DS.surface,
    borderColor: "#fbbf24",
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  cacheRequiredBtnText: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "600"
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  emptyStateText: {
    color: DS.textMuted,
    fontSize: 13,
    textAlign: "center"
  },
  footerLoader: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 16,
    paddingTop: 12
  },
  footerLoaderText: {
    color: DS.textSubtle,
    fontSize: 12
  }
});
