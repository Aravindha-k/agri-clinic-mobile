import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Farmer, fetchFarmersPage } from "../api/farmers";
import { getOptionLabel } from "../api/masters";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { InlineErrorBanner } from "../components/InlineErrorBanner";
import { MasterDataOfflineBanner } from "../components/MasterDataOfflineBanner";
import { FarmerCard, ListFooterSkeleton, PageHeader, SearchBar, SkeletonCard, SyncStatusBadge } from "../components/ui";
import { SearchableSelectField } from "../components/ui/SearchableSelectField";
import { SearchableSelectItem } from "../components/ui/SearchableSelectModal";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { FarmersStackParamList } from "../navigation/types";
import { useGpsWorkGuard } from "../hooks/useGpsWorkGuard";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { useMasterData } from "../storage/MasterDataContext";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useTheme } from "../theme";
import { listCardLayout } from "../theme/listCard";
import { useRefreshControlProps } from "../hooks/useRefreshControlProps";
import { farmerMatchesSearch } from "../utils/farmerSearch";
import { FarmerQuickFilter, matchesFarmerQuickFilter } from "../utils/farmerDirectory";
import { navigateFarmerMap } from "../navigation/navigateFarmerMap";
import { prefillFromFarmer } from "../utils/farmerPrefill";

type Props = NativeStackScreenProps<FarmersStackParamList, "FarmersList">;

const QUICK_FILTERS: { id: FarmerQuickFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recently Visited" },
  { id: "not_visited", label: "Not Visited" }
];

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 350;

export function FarmersListScreen({ navigation }: Props) {
  useSecureScreen();
  const { theme } = useTheme();
  const { colors: c } = useDesignSystem();
  const { farmersVersion } = useFieldDataRefresh();
  const { villages, refreshMasterData, syncAllFarmers, syncingAllFarmers } = useMasterData();
  const { canRunWorkAction } = useGpsWorkGuard();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [villageId, setVillageId] = useState("");
  const [quickFilter, setQuickFilter] = useState<FarmerQuickFilter>("all");
  const requestId = useRef(0);
  const skipNextFocusReload = useRef(true);

  const villageName = useMemo(() => {
    if (!villageId) return "";
    const match = villages.find((v) => String(v.id) === villageId);
    return match ? getOptionLabel(match) : "";
  }, [villageId, villages]);

  const villageItems: SearchableSelectItem[] = useMemo(
    () => [
      { id: "", title: "All villages" },
      ...villages.map((v) => ({
        id: String(v.id),
        title: getOptionLabel(v),
        tamilTitle: v.name_ta || undefined,
        subtitle: v.district_name || undefined
      }))
    ],
    [villages]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const loadFirstPage = useCallback(async () => {
    const id = ++requestId.current;
    setError("");
    setLoading(true);
    try {
      const page = await fetchFarmersPage({
        page: 1,
        pageSize: PAGE_SIZE,
        search: debouncedQuery || undefined,
        village: villageName || undefined
      });
      if (id !== requestId.current) return;
      setFarmers(page.results);
      setNextUrl(page.next);
      setTotalCount(page.count);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Unable to load farmers.");
      setFarmers([]);
      setNextUrl(null);
      setTotalCount(null);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedQuery, villageName]);

  const loadMore = useCallback(async () => {
    if (!nextUrl || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await fetchFarmersPage({ nextUrl });
      setFarmers((current) => {
        const seen = new Set(current.map((f) => f.id));
        const merged = [...current];
        for (const row of page.results) {
          if (!seen.has(row.id)) {
            merged.push(row);
          }
        }
        return merged;
      });
      setNextUrl(page.next);
      if (page.count != null) {
        setTotalCount(page.count);
      }
    } catch {
      // keep existing rows
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, nextUrl]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      if (skipNextFocusReload.current) {
        skipNextFocusReload.current = false;
        return;
      }
      void loadFirstPage();
    });
    return unsub;
  }, [loadFirstPage, navigation]);

  useEffect(() => {
    if (farmersVersion > 0) {
      setRefreshing(true);
      void loadFirstPage();
    }
  }, [farmersVersion, loadFirstPage]);

  const visible = useMemo(() => {
    return farmers.filter((farmer) => {
      if (!matchesFarmerQuickFilter(farmer, quickFilter)) return false;
      if (query.trim() && !farmerMatchesSearch(farmer, query)) return false;
      return true;
    });
  }, [farmers, quickFilter, query]);

  const rootNav = navigation.getParent()?.getParent();

  const countLine = useMemo(() => {
    const filtered = visible.length;
    const total = totalCount ?? farmers.length;
    if (quickFilter !== "all" || villageId || debouncedQuery) {
      return (
        <>
          <Text style={{ color: c.primaryDark, fontWeight: "800" }}>{filtered}</Text>
          {" shown"}
          {totalCount != null ? (
            <>
              {" · "}
              <Text style={{ color: c.muted }}>{total} in directory</Text>
            </>
          ) : null}
        </>
      );
    }
    return (
      <>
        <Text style={{ color: c.primaryDark, fontWeight: "800" }}>{total}</Text>
        {" farmers in directory"}
      </>
    );
  }, [c.muted, c.primaryDark, debouncedQuery, farmers.length, quickFilter, totalCount, villageId, visible.length]);

  if (error && farmers.length === 0 && !loading) {
    return <ErrorState message={error} onRetry={() => loadFirstPage()} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <MasterDataOfflineBanner onPressSync={() => void refreshMasterData()} />
      <View style={styles.toolbar}>
        <PageHeader title="Farmers" subtitle="Directory & quick revisit" right={<SyncStatusBadge onPress={() => rootNav?.navigate("OfflineSync")} />} />
        {error && farmers.length > 0 ? <InlineErrorBanner message={error} onRetry={() => loadFirstPage()} /> : null}
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search name or phone…" />
        <SearchableSelectField
          label="Village"
          value={villageId}
          items={villageItems}
          placeholder="All villages"
          onChange={(id) => setVillageId(id)}
          modalTitle="Filter by village"
        />
        <View style={styles.chips}>
          {QUICK_FILTERS.map((chip) => {
            const active = quickFilter === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => setQuickFilter(chip.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.primarySoft : c.cardMuted,
                    borderColor: active ? c.primary : c.border
                  }
                ]}
              >
                <Text style={[styles.chipText, { color: active ? c.primaryDark : c.text }]}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.countLine, { color: c.muted }]}>{countLine}</Text>
        <Pressable
          onPress={() => void syncAllFarmers()}
          disabled={syncingAllFarmers}
          style={styles.syncAllLink}
        >
          <Text style={{ color: c.primaryDark, fontWeight: "800", fontSize: 13 }}>
            {syncingAllFarmers ? "Syncing full directory…" : "Sync all farmers for offline"}
          </Text>
        </Pressable>
      </View>
      {loading && farmers.length === 0 ? (
        <View style={styles.pad}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <View style={styles.listFlex}>
        <FlashList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadFirstPage();
                void refreshMasterData();
              }}
              {...refreshControlProps}
            />
          }
          contentContainerStyle={{ paddingBottom: tabInset, paddingHorizontal: 16, paddingTop: 4 }}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={loadingMore ? <ListFooterSkeleton /> : null}
          ListEmptyComponent={
            <EmptyState
              title="No farmers found"
              message={
                query.trim() || villageId || quickFilter !== "all"
                  ? "Try a different search or filter."
                  : "Farmers from your clinic directory appear here."
              }
              illustration="farmers"
              actionLabel={query.trim() || villageId || quickFilter !== "all" ? "Clear filters" : undefined}
              onAction={
                query.trim() || villageId || quickFilter !== "all"
                  ? () => {
                      setQuery("");
                      setVillageId("");
                      setQuickFilter("all");
                    }
                  : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <FarmerCard
              farmer={item}
              onPress={() => navigation.navigate("FarmerDetail", { id: item.id })}
              onViewMap={() =>
                navigateFarmerMap(navigation, {
                  farmerId: item.id,
                  farmerName: item.name,
                  village: String(item.village_name || item.village || ""),
                  latitude: item.latitude,
                  longitude: item.longitude
                })
              }
              onRevisit={() => {
                if (!canRunWorkAction()) return;
                rootNav?.navigate("VisitFlow", {
                  screen: "NewVisitFarmer",
                  params: { prefill: prefillFromFarmer(item), fastRevisit: true }
                });
              }}
            />
          )}
        />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { gap: listCardLayout.listGap, paddingHorizontal: 16, paddingTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipText: { fontSize: 13, fontWeight: "800" },
  countLine: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  syncAllLink: { paddingVertical: 4 },
  listFlex: { flex: 1 },
  separator: { height: listCardLayout.listGap },
  pad: { gap: listCardLayout.listGap, padding: 16 },
  footerLoader: { paddingVertical: 16 }
});
