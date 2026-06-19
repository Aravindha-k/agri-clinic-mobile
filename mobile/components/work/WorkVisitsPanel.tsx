import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { FilterPillRow } from "../FilterPillRow";
import { ScreenLoader } from "../layout/ScreenLoader";
import { InlineSeedLoader } from "../layout/InlineSeedLoader";
import {
  FadeInSection,
  entranceListStagger,
  entranceStagger
} from "../ui/FadeInSection";
import { SectionLabel } from "../SectionLabel";
import {
  fetchVisitsPage,
  isVisitHistoryEntry,
  type Visit,
  type VisitDateFilter
} from "../../../src/api/visits";
import { BrandLogo } from "../../../src/components/brand/BrandLogo";
import { LOGO_IMAGE } from "../../../src/config/brand";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { visitDisplayIso } from "../../../src/utils/format";
import { VisitListCard } from "../visits/VisitListCard";
import {
  buildVisitListRows,
  stickySectionIndices,
  type VisitListRow
} from "../../lib/visitListSections";
import { readPendingVisits, type PendingVisitRecord } from "../../lib/pendingVisitsQueue";
import { DS } from "../../../src/theme/globalStyles";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

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

function sortVisitsNewestFirst(items: Visit[]) {
  return [...items].sort((a, b) => {
    const ta = visitDisplayIso(a) ? new Date(visitDisplayIso(a)!).getTime() : 0;
    const tb = visitDisplayIso(b) ? new Date(visitDisplayIso(b)!).getTime() : 0;
    return tb - ta;
  });
}

export function WorkVisitsPanel({
  entranceTick,
  entranceStep = 2
}: {
  entranceTick?: number | string;
  entranceStep?: number;
} = {}) {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const { visitsVersion, bumpAfterVisitChange } = useFieldDataRefresh();
  const { refreshQueue, syncAll } = useOfflineSync();
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
    try {
      const result = await syncAll();
      await loadPending();
      if (result.synced > 0) {
        bumpAfterVisitChange();
        await loadVisits({ refresh: true });
      }
    } finally {
      setSyncing(false);
    }
  }, [bumpAfterVisitChange, loadPending, loadVisits, syncAll, syncing]);

  const renderItem = useCallback(
    ({ item, index }: { item: VisitListRow; index: number }) => {
      const wrap = (node: ReactNode, asCard = false): ReactElement => {
        if (!entranceTick) return <>{node}</>;
        return (
          <FadeInSection
            replayKey={entranceTick}
            delay={entranceListStagger(entranceStep + 1, index)}
            variant={asCard ? "card" : "section"}
          >
            {node}
          </FadeInSection>
        );
      };

      if (item.kind === "section") {
        return wrap(<SectionLabel title={item.title} first={item.title === "PENDING SYNC"} />);
      }
      if (item.kind === "pending") {
        return wrap(<VisitListCard pending={item.pending} />, true);
      }
      return wrap(
        <VisitListCard
          visit={item.visit}
          onPress={() => navigation.navigate("VisitDetail", { id: item.visit.id })}
        />,
        true
      );
    },
    [entranceStep, entranceTick, navigation]
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
    () => (
      <View style={styles.emptyState}>
        <LogoWatermark size={48} opacity={0.1} />
        <Text style={styles.emptyStateText}>{t("home.noVisitsYet")}</Text>
      </View>
    ),
    [t]
  );

  const ListFooterComponent = useMemo(
    () => (loadingMore ? <InlineSeedLoader /> : null),
    [loadingMore]
  );

  const controls = (
    <>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {headerCount} {t("farmers.total")}
        </Text>
      </View>

      {showPendingBanner ? (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingBannerCopy}>
            <Text style={styles.pendingBannerTitle}>
              {syncing
                ? t("home.syncing")
                : t(pendingVisits.length === 1 ? "visits.pendingSync" : "visits.pendingSync_plural", {
                    count: pendingVisits.length
                  })}
            </Text>
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
              <ActivityIndicator color={Colors.amberText} size="small" />
            ) : (
              <Text style={styles.syncBtnText}>{t("visits.syncNow")}</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
    </>
  );

  return (
    <View style={styles.shell}>
      {entranceTick ? (
        <FadeInSection replayKey={entranceTick} delay={entranceStagger(entranceStep)}>
          {controls}
        </FadeInSection>
      ) : (
        controls
      )}

      <View style={styles.listArea}>
        {loading ? (
          <ScreenLoader />
        ) : (
          <FlashList
            data={listRows}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            stickyHeaderIndices={stickyIndices}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: tabInset + 16, paddingTop: 8 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />
            }
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.2}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={ListEmptyComponent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0
  },
  listArea: {
    flex: 1,
    minHeight: 0
  },
  summaryRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md
  },
  summaryText: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  pendingBanner: {
    alignItems: "center",
    backgroundColor: Colors.amberBg,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  pendingBannerCopy: {
    flex: 1,
    gap: 4
  },
  pendingBannerTitle: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  pendingBannerError: {
    color: Colors.red,
    fontSize: FontSize.xs
  },
  syncBtn: {
    backgroundColor: Colors.surface,
    borderColor: Colors.amber,
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
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  errorText: {
    color: Colors.red,
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm
  },
  list: {
    flex: 1
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  emptyStateText: {
    color: Colors.text3,
    fontSize: FontSize.base,
    textAlign: "center"
  },
  footerLoader: {
    alignItems: "center",
    paddingVertical: 16
  }
});
