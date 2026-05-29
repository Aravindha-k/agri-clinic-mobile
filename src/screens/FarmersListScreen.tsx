import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Farmer, getFarmersForFieldWorker } from "../api/farmers";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { InlineErrorBanner } from "../components/InlineErrorBanner";
import { AppHeader, FarmerCard, SearchBar, SkeletonCard, SyncStatusBadge } from "../components/ui";
import { FarmersStackParamList } from "../navigation/types";
import { useGpsWorkGuard } from "../hooks/useGpsWorkGuard";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useTheme } from "../theme";
import { listCardLayout, listCardType } from "../theme/listCard";
import { useRefreshControlProps } from "../hooks/useRefreshControlProps";
import { layout } from "../theme/designSystem";
import { asArray } from "../utils/format";
import { farmerMatchesSearch } from "../utils/farmerSearch";
import { navigateFarmerMap } from "../navigation/navigateFarmerMap";
import { prefillFromFarmer } from "../utils/farmerPrefill";

type Props = NativeStackScreenProps<FarmersStackParamList, "FarmersList">;

export function FarmersListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { farmersVersion } = useFieldDataRefresh();
  const { canRunWorkAction } = useGpsWorkGuard();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      setFarmers(asArray<Farmer>(await getFarmersForFieldWorker()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load farmers.");
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => load(false));
    return unsub;
  }, [load, navigation]);

  useEffect(() => {
    if (farmersVersion > 0) load(true);
  }, [farmersVersion, load]);

  const visible = useMemo(() => farmers.filter((f) => farmerMatchesSearch(f, query)), [farmers, query]);
  const rootNav = navigation.getParent()?.getParent();

  if (error && farmers.length === 0 && !loading) {
    return <ErrorState message={error} onRetry={() => load(false)} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader
        title="Farmers"
        subtitle={`${farmers.length} active in clinic`}
        showLogoMark
        right={<SyncStatusBadge onPress={() => rootNav?.navigate("OfflineSync")} />}
      />
      <View style={styles.toolbar}>
        {error && farmers.length > 0 ? <InlineErrorBanner message={error} onRetry={() => load(true)} /> : null}
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search name, mobile, village, crop…" />
        <View style={[styles.countBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[listCardType.metric, { color: c.primaryDark }]}>{visible.length}</Text>
          <Text style={[listCardType.meta, { color: c.muted, flex: 1 }]}>
            {query.trim() ? "farmers matching search" : "farmers in directory"}
          </Text>
        </View>
      </View>
      {loading && farmers.length === 0 ? (
        <View style={styles.pad}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
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
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyState
              title="No farmers found"
              message={query.trim() ? "Try a different search." : "Farmers from your clinic directory appear here."}
              illustration="farmers"
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
              onStartVisit={() => {
                if (!canRunWorkAction()) return;
                rootNav?.navigate("VisitFlow", {
                  screen: "NewVisitFarmer",
                  params: { prefill: prefillFromFarmer(item) }
                });
              }}
            />
          )}
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
  pad: { gap: listCardLayout.listGap, padding: 16 }
});
