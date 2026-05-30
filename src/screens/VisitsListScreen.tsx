import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { fetchVisitsPage, isVisitHistoryEntry, Visit } from "../api/visits";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { InlineErrorBanner } from "../components/InlineErrorBanner";
import { AppHeader, SearchBar, SkeletonCard, SyncStatusBadge, VisitCard } from "../components/ui";
import { VisitsStackParamList } from "../navigation/types";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useTheme } from "../theme";
import { listCardLayout, listCardType } from "../theme/listCard";
import { useRefreshControlProps } from "../hooks/useRefreshControlProps";
import { visitDisplayIso } from "../utils/format";
import { resolveVisitFarmer } from "../utils/visitFarmer";
import { formatVisitCropLine } from "../utils/visitStatus";

type Props = NativeStackScreenProps<VisitsStackParamList, "VisitsList">;

function visitMatchesQuery(visit: Visit, q: string) {
  if (!q.trim()) return true;
  const farmer = resolveVisitFarmer(visit);
  const needle = q.trim().toLowerCase();
  const hay = [
    visit.farmer_name,
    visit.farmer_phone,
    visit.village_name,
    visit.crop_name,
    farmer.cropName !== "—" ? farmer.cropName : formatVisitCropLine(visit, "")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function sortVisitsNewestFirst(items: Visit[]) {
  return [...items].sort((a, b) => {
    const ta = visitDisplayIso(a) ? new Date(visitDisplayIso(a)!).getTime() : 0;
    const tb = visitDisplayIso(b) ? new Date(visitDisplayIso(b)!).getTime() : 0;
    return tb - ta;
  });
}

export function VisitsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { visitsVersion } = useFieldDataRefresh();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      const page = await fetchVisitsPage({});
      const rows = page.results.filter(isVisitHistoryEntry);
      setVisits(sortVisitsNewestFirst(rows));
      setNextUrl(page.next);
      setTotalCount(page.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load visits.");
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextUrl || loadingMore || loading) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await fetchVisitsPage({ nextUrl });
      const rows = page.results.filter(isVisitHistoryEntry);
      setVisits((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        const merged = [...prev, ...rows.filter((v) => !seen.has(v.id))];
        return sortVisitsNewestFirst(merged);
      });
      setNextUrl(page.next);
      if (page.count != null) {
        setTotalCount(page.count);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load more visits.");
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, nextUrl]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => load(false));
    return unsub;
  }, [load, navigation]);

  useEffect(() => {
    if (visitsVersion > 0) load(true);
  }, [visitsVersion, load]);

  const visible = useMemo(
    () => sortVisitsNewestFirst(visits.filter((v) => visitMatchesQuery(v, query))),
    [visits, query]
  );
  const rootNav = navigation.getParent()?.getParent();

  if (error && visits.length === 0 && !loading) {
    return <ErrorState message={error} onRetry={() => load(false)} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader
        title="Visits"
        subtitle="All field visits"
        showLogoMark
        right={<SyncStatusBadge onPress={() => rootNav?.navigate("OfflineSync")} />}
      />
      <View style={styles.toolbar}>
        {error && visits.length > 0 ? <InlineErrorBanner message={error} onRetry={() => load(true)} /> : null}
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search farmer, village, crop…" />
        <View style={[styles.countBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[listCardType.metric, { color: c.primaryDark }]}>
            {query.trim() ? visible.length : totalCount ?? visible.length}
          </Text>
          <Text style={[listCardType.meta, { color: c.muted, flex: 1 }]}>
            {query.trim() ? "visits matching search" : "total visits logged"}
          </Text>
        </View>
      </View>
      {loading && visits.length === 0 ? (
        <View style={styles.pad}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <VisitCard visit={item} onPress={() => navigation.navigate("VisitDetail", { id: item.id })} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              {...refreshControlProps}
            />
          }
          contentContainerStyle={[styles.list, { paddingBottom: tabInset }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={c.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="No visits yet"
              message={query.trim() ? "Try a different search." : "Submitted field visits will appear here."}
              illustration="visits"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { gap: listCardLayout.listGap, paddingHorizontal: 16, paddingTop: 8 },
  countBar: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  separator: { height: listCardLayout.listGap },
  footer: { alignItems: "center", paddingVertical: 16 },
  pad: { gap: listCardLayout.listGap, padding: 16 }
});
