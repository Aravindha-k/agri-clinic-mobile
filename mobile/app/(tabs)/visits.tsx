import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { FilterPillRow } from "../../components/FilterPillRow";
import { KavyaLoader } from "../../components/KavyaLoader";
import { CascadeIn } from "../../../src/components/ui/CascadeIn";
import { NeonProgressBar } from "../../../src/components/cinematic";
import { ScreenBackground } from "../../../src/components/glass";
import NumberFlip from "../../../src/components/cinematic/NumberFlip";
import { SkeletonCard } from "../../../src/components/ui/SkeletonCard";
import { SectionLabel } from "../../components/SectionLabel";
import {
  fetchVisitsPage,
  isVisitHistoryEntry,
  type Visit,
  type VisitDateFilter
} from "../../../src/api/visits";
import { BrandLogo } from "../../../src/components/brand/BrandLogo";
import { LOGO_IMAGE } from "../../../src/config/brand";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { visitDisplayIso } from "../../../src/utils/format";
import { VisitListCard } from "../../components/visits/VisitListCard";
import { flushVisitQueue, type VisitSyncProgress } from "../../lib/offlineSyncManager";
import {
  buildVisitListRows,
  stickySectionIndices,
  type VisitListRow
} from "../../lib/visitListSections";
import { readPendingVisits, type PendingVisitRecord } from "../../lib/pendingVisitsQueue";
import { DS } from "../../../src/theme/globalStyles";
import { ENT } from "../../../src/theme/enterprise";

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

function VisitsEmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <LogoWatermark size={48} opacity={0.1} />
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

function sortVisitsNewestFirst(items: Visit[]) {
  return [...items].sort((a, b) => {
    const ta = visitDisplayIso(a) ? new Date(visitDisplayIso(a)!).getTime() : 0;
    const tb = visitDisplayIso(b) ? new Date(visitDisplayIso(b)!).getTime() : 0;
    return tb - ta;
  });
}

export default function VisitsTabScreen() {
  useSecureScreen();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const { visitsVersion, bumpAfterVisitChange } = useFieldDataRefresh();
  const { refreshQueue } = useOfflineSync();
  const requestId = useRef(0);

  const [visits, setVisits] = useState<Visit[]>([]);
  const [pendingVisits, setPendingVisits] = useState<PendingVisitRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState<VisitDateFilter>("all");
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<VisitSyncProgress | null>(null);
  const listOpacity = useRef(new Animated.Value(1)).current;

  const loadPending = useCallback(async () => {
    setPendingVisits(await readPendingVisits());
  }, []);

  const loadVisits = useCallback(
    async (opts?: { refresh?: boolean; filter?: VisitDateFilter }) => {
      const id = ++requestId.current;
      const filter = opts?.filter ?? dateFilter;
      if (!opts?.refresh) setLoading(true);
      setError("");
      try {
        const page = await fetchVisitsPage({ page: 1, dateFilter: filter });
        if (id !== requestId.current) return;
        const rows = page.results.filter(isVisitHistoryEntry);
        setVisits(sortVisitsNewestFirst(rows));
        setNextUrl(page.next);
        setTotalCount(page.count ?? rows.length);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : t("visits.loadError"));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [dateFilter, t]
  );

  const loadMore = useCallback(async () => {
    if (!nextUrl || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await fetchVisitsPage({ nextUrl });
      const rows = page.results.filter(isVisitHistoryEntry);
      setVisits((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        return sortVisitsNewestFirst([...prev, ...rows.filter((v) => !seen.has(v.id))]);
      });
      setNextUrl(page.next);
      if (page.count != null) setTotalCount(page.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("visits.loadError"));
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, nextUrl, t]);

  useFocusEffect(
    useCallback(() => {
      void loadPending();
      void loadVisits({ refresh: true });
    }, [loadPending, loadVisits])
  );

  useEffect(() => {
    if (visitsVersion > 0) {
      void loadPending();
      void loadVisits({ refresh: true });
    }
  }, [visitsVersion, loadPending, loadVisits]);

  const listRows = useMemo(
    () => buildVisitListRows(pendingVisits, visits, ""),
    [pendingVisits, visits]
  );

  const stickyIndices = useMemo(() => stickySectionIndices(listRows), [listRows]);
  const headerCount = totalCount + pendingVisits.length;
  const showPendingBanner = pendingVisits.length > 0;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPending();
    void loadVisits({ refresh: true });
  }, [loadPending, loadVisits]);

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress(null);
    try {
      const result = await flushVisitQueue((progress) => setSyncProgress(progress));
      await refreshQueue();
      await loadPending();
      if (result.synced > 0) {
        bumpAfterVisitChange();
        await loadVisits({ refresh: true });
      }
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [bumpAfterVisitChange, loadPending, loadVisits, refreshQueue, syncing]);

  const switchFilter = useCallback(
    (newFilter: VisitDateFilter) => {
      Animated.timing(listOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setDateFilter(newFilter);
        void loadVisits({ filter: newFilter });
        Animated.timing(listOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    },
    [listOpacity, loadVisits]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: VisitListRow; index: number }) => {
      if (item.kind === "section") {
        return <SectionLabel title={item.title} first={item.title === "PENDING SYNC"} />;
      }
      const card =
        item.kind === "pending" ? (
          <VisitListCard pending={item.pending} />
        ) : (
          <VisitListCard
            visit={item.visit}
            onPress={() => navigation.navigate("VisitDetail", { id: item.visit.id })}
          />
        );
      return <CascadeIn index={index % 6}>{card}</CascadeIn>;
    },
    [navigation]
  );

  const dateFilters = useMemo(
    (): { id: VisitDateFilter; label: string }[] => [
      { id: "today", label: t("visits.today") },
      { id: "week", label: t("visits.week") },
      { id: "month", label: t("visits.month") },
      { id: "all", label: t("visits.all") }
    ],
    [t]
  );

  const ListEmptyComponent = useMemo(
    () =>
      loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} height={100} />
          ))}
        </View>
      ) : (
        <VisitsEmptyState message={t("home.noVisitsYet")} />
      ),
    [loading, t]
  );

  const ListFooterComponent = useMemo(
    () =>
      loadingMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={DS.accent} />
        </View>
      ) : null,
    [loadingMore]
  );

  return (
    <View style={[styles.screen, { paddingTop: safeTop }]}>
      <ScreenBackground />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{t("visits.myVisits")}</Text>
            <Text style={styles.subtitle}>
              {headerCount} {t("farmers.total")}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <NumberFlip value={headerCount} style={styles.countBadgeText} glowInterval={4000} />
          </View>
        </View>

        {showPendingBanner ? (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingBannerCopy}>
              <Text style={styles.pendingBannerTitle}>
                {syncing && syncProgress
                  ? `Syncing ${syncProgress.index + 1}/${syncProgress.total}: ${syncProgress.farmerName}`
                  : t(pendingVisits.length === 1 ? "visits.pendingSync" : "visits.pendingSync_plural", {
                      count: pendingVisits.length
                    })}
              </Text>
              {syncing && syncProgress?.status === "failed" && syncProgress.error ? (
                <Text style={styles.pendingBannerError}>{syncProgress.error}</Text>
              ) : null}
              {syncing && syncProgress ? (
                <NeonProgressBar
                  progress={(syncProgress.index + 1) / Math.max(syncProgress.total, 1)}
                  height={3}
                  style={{ marginTop: 8 }}
                />
              ) : null}
            </View>
            <Pressable
              onPress={() => void handleSync()}
              disabled={syncing}
              style={({ pressed }) => [
                styles.syncBtn,
                pressed && { opacity: 0.9 },
                syncing && styles.syncBtnDisabled
              ]}
            >
              {syncing ? (
                <ActivityIndicator color="#b45309" size="small" />
              ) : (
                <Text style={styles.syncBtnText}>{t("visits.syncNow")}</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <FilterPillRow
        pills={dateFilters.map((chip) => ({
          id: chip.id,
          label: chip.label,
          active: dateFilter === chip.id,
          onPress: () => switchFilter(chip.id)
        }))}
      />

      <Animated.View style={[styles.listShell, { opacity: listOpacity }]}>
        <FlashList
          data={listRows}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          stickyHeaderIndices={stickyIndices}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: tabInset + 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.2}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
        />
      </Animated.View>
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
    gap: 2
  },
  title: {
    color: ENT.text,
    fontSize: 22,
    fontWeight: "800"
  },
  subtitle: {
    color: ENT.textSecondary,
    fontSize: 10
  },
  countBadge: {
    backgroundColor: ENT.bg,
    borderColor: ENT.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  countBadgeText: {
    color: ENT.text,
    fontSize: 14,
    fontWeight: "800"
  },
  pendingBanner: {
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  pendingBannerCopy: {
    flex: 1,
    gap: 4
  },
  pendingBannerTitle: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "600"
  },
  pendingBannerError: {
    color: "#dc2626",
    fontSize: 11
  },
  syncBtn: {
    backgroundColor: DS.surface,
    borderColor: "#fbbf24",
    borderRadius: 9,
    borderWidth: 1,
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  syncBtnDisabled: {
    opacity: 0.7
  },
  syncBtnText: {
    color: "#b45309",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center"
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  emptyStateText: {
    color: ENT.textSecondary,
    fontSize: 13,
    textAlign: "center"
  },
  footerLoader: {
    alignItems: "center",
    paddingVertical: 16
  }
});
