import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { FilterPillRow } from "../../components/FilterPillRow";
import { KavyaLoader } from "../../components/KavyaLoader";
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

const DS = {
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#f1f5f9",
  inputBorder: "#e2e8f0",
  textPrimary: "#0f172a",
  textMuted: "#94a3b8",
  textSubtle: "#64748b",
  accent: "#16a34a",
  accentBg: "#f0fdf4"
} as const;

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

  const renderItem = useCallback(
    ({ item }: { item: VisitListRow }) => {
      if (item.kind === "section") {
        return <SectionLabel title={item.title} first={item.title === "PENDING SYNC"} />;
      }
      if (item.kind === "pending") {
        return <VisitListCard pending={item.pending} />;
      }
      return (
        <VisitListCard
          visit={item.visit}
          onPress={() => navigation.navigate("VisitDetail", { id: item.visit.id })}
        />
      );
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
        <KavyaLoader />
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
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{t("visits.myVisits")}</Text>
            <Text style={styles.subtitle}>
              {headerCount} {t("farmers.total")}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{headerCount}</Text>
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
          onPress: () => {
            setDateFilter(chip.id);
            void loadVisits({ filter: chip.id });
          }
        }))}
      />

      <View style={styles.listShell}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: DS.bg,
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
    backgroundColor: DS.surface,
    borderBottomColor: DS.border,
    borderBottomWidth: 1,
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
    color: DS.textPrimary,
    fontSize: 22,
    fontWeight: "800"
  },
  subtitle: {
    color: DS.textMuted,
    fontSize: 10
  },
  countBadge: {
    backgroundColor: DS.accentBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  countBadgeText: {
    color: DS.accent,
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
    color: DS.textMuted,
    fontSize: 13,
    textAlign: "center"
  },
  footerLoader: {
    alignItems: "center",
    paddingVertical: 16
  }
});
