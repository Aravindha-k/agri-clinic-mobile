import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { FilterPillRow } from "../FilterPillRow";
import { ListStateView } from "../ui/ListStateView";
import { InlineSeedLoader } from "../layout/InlineSeedLoader";
import { ScreenLoader } from "../layout/ScreenLoader";
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
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useSyncStore } from "../../lib/store/syncStore";
import { visitDisplayIso } from "../../../src/utils/format";
import { VisitListCard } from "../visits/VisitListCard";
import { PendingVisitDetail } from "../visits/PendingVisitDetail";
import {
  buildVisitListRows,
  stickySectionIndices,
  type VisitListRow
} from "../../lib/visitListSections";
import { readPendingVisits, type PendingVisitRecord } from "../../lib/pendingVisitsQueue";
import { DS } from "../../../src/theme/globalStyles";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../../lib/theme";

function sortVisitsNewestFirst(items: Visit[]) {
  return [...items].sort((a, b) => {
    const ta = visitDisplayIso(a) ? new Date(visitDisplayIso(a)!).getTime() : 0;
    const tb = visitDisplayIso(b) ? new Date(visitDisplayIso(b)!).getTime() : 0;
    return tb - ta;
  });
}

const MAX_ROW_ENTRANCE = 6;

export function WorkVisitsPanel({
  active = true,
  entranceTick,
  entranceStep = 2
}: {
  active?: boolean;
  entranceTick?: number | string;
  entranceStep?: number;
} = {}) {
  const { t, language } = useI18n();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const { visitsVersion, bumpAfterVisitChange } = useFieldDataRefresh();
  const syncing = useSyncStore((s) => s.isSyncing);
  const requestId = useRef(0);

  const lastVisitsFocusLoadRef = useRef(0);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [pendingVisits, setPendingVisits] = useState<PendingVisitRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState<VisitDateFilter>("all");
  const [selectedPending, setSelectedPending] = useState<PendingVisitRecord | null>(null);

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
      if (!isFocused || !active) return;
      const now = Date.now();
      // Soft TTL — avoid full visits refresh fighting tab animation every return.
      if (now - lastVisitsFocusLoadRef.current < 45_000 && visits.length > 0) {
        void loadPending();
        return;
      }
      lastVisitsFocusLoadRef.current = now;
      const task = InteractionManager.runAfterInteractions(() => {
        void loadPending();
        void loadVisits({ refresh: true });
      });
      return () => task.cancel();
    }, [active, isFocused, loadPending, loadVisits, visits.length])
  );

  useEffect(() => {
    if (!active || visitsVersion <= 0) return;
    void loadPending();
    void loadVisits({ refresh: true });
  }, [active, visitsVersion, loadPending, loadVisits]);

  const listRows = useMemo(() => {
    const labels = {
      today: t("work.sectionToday"),
      yesterday: t("work.sectionYesterday"),
      pendingSync: t("work.pendingSyncSection"),
      unknownDate: t("work.unknownDate")
    };
    return buildVisitListRows(pendingVisits, visits, "", labels, language);
  }, [language, pendingVisits, t, visits]);

  const stickyIndices = useMemo(() => stickySectionIndices(listRows), [listRows]);
  const headerCount = totalCount + pendingVisits.length;
  const showPendingBanner = pendingVisits.length > 0;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPending();
    void loadVisits({ refresh: true });
  }, [loadPending, loadVisits]);

  const renderItem = useCallback(
    ({ item, index }: { item: VisitListRow; index: number }) => {
      const shouldAnimate = Boolean(entranceTick) && index < MAX_ROW_ENTRANCE;
      const wrap = (node: ReactNode, asCard = false): ReactElement => {
        if (!shouldAnimate) return <>{node}</>;
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
        return wrap(
          <VisitListCard pending={item.pending} onPress={() => setSelectedPending(item.pending)} />,
          true
        );
      }
      return wrap(
        <VisitListCard
          visit={item.visit}
          onPress={() => navigation.push("VisitDetail", { id: item.visit.id })}
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
    () => <ListStateView kind="empty" title={t("home.noVisitsYet")} compact />,
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
            <Text style={styles.pendingBannerHint}>{t("syncHealth.autoSyncHint")}</Text>
          </View>
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
            setNextUrl(null);
            setVisits([]);
            setLoading(true);
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
        {loading && visits.length === 0 && pendingVisits.length === 0 ? (
          <ScreenLoader compact message={t("common.loading")} />
        ) : (
          <FlashList
            data={listRows}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            getItemType={(item) => item.kind}
            stickyHeaderIndices={stickyIndices}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: tabInset + Layout.scrollBottomExtra, paddingTop: 8 }}
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
      <PendingVisitDetail
        visit={selectedPending}
        onClose={() => setSelectedPending(null)}
        onChanged={() => {
          void loadPending();
          bumpAfterVisitChange();
        }}
      />
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
  pendingBannerHint: {
    color: Colors.text3,
    fontSize: FontSize.xs
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
  footerLoader: {
    alignItems: "center",
    paddingVertical: 16
  }
});
