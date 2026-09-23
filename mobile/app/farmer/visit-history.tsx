import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Visit } from "../../../src/api/visits";
import { fetchFarmerVisitsPage } from "../../../src/api/farmers";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import type { WorkStackParamList } from "../../../src/navigation/types";
import { ScreenErrorBoundary } from "../../../src/components/ScreenErrorBoundary";
import { ScreenEntranceShell, StackScreenHeader } from "../../components/layout";
import { FlatCard } from "../../components/layout/FlatCard";
import { ListStateView } from "../../components/ui/ListStateView";
import { StatusChip } from "../../components/ui";
import { InlineSeedLoader } from "../../components/layout/InlineSeedLoader";
import {
  farmerVisitHistoryRow,
  sortVisitsNewestFirst
} from "../../lib/farmerVisitHistory";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

type Props = NativeStackScreenProps<WorkStackParamList, "FarmerVisitHistory">;

function VisitHistoryCard({ visit, onPress }: { visit: Visit; onPress: () => void }) {
  const { t } = useI18n();
  const row = farmerVisitHistoryRow(visit);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.92 }}
      accessibilityRole="button"
      accessibilityLabel={`${t("farmerDetail.visitHistory")} ${[row.date, row.time].filter(Boolean).join(" ")}`}
    >
      <FlatCard style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.date} numberOfLines={1}>
            {[row.date, row.time].filter(Boolean).join(" · ") || t("work.unknownDate")}
          </Text>
          {row.status ? <StatusChip label={row.status} variant="green" /> : null}
        </View>
        {row.crop ? (
          <Text style={styles.line} numberOfLines={1}>
            <Text style={styles.label}>{t("farmerDetail.cropLabel")}: </Text>
            {row.crop}
          </Text>
        ) : null}
        {row.problems ? (
          <Text style={styles.line} numberOfLines={2}>
            <Text style={styles.label}>{t("farmerDetail.problemLabel")}: </Text>
            {row.problems}
          </Text>
        ) : null}
        {row.village ? (
          <Text style={styles.village} numberOfLines={1}>
            {row.village}
          </Text>
        ) : null}
      </FlatCard>
    </Pressable>
  );
}

function FarmerVisitHistoryInner({ route, navigation }: Props) {
  useSecureScreen();
  const { t } = useI18n();
  const refreshControlProps = useRefreshControlProps();
  const farmerId = Number(route.params.farmerId);
  const farmerName = route.params.farmerName?.trim();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadPage = useCallback(
    async (mode: "initial" | "refresh" | "more") => {
      if (!Number.isFinite(farmerId) || farmerId <= 0) {
        setError(t("farmerDetail.invalidFarmer"));
        setLoading(false);
        return;
      }
      if (mode === "more" && (!nextUrl || loadingMore)) return;
      try {
        if (mode === "more") setLoadingMore(true);
        else setError("");
        const page = await fetchFarmerVisitsPage(farmerId, {
          nextUrl: mode === "more" ? nextUrl : null
        });
        setVisits((prev) => {
          const merged = mode === "more" ? [...prev, ...page.results] : page.results;
          const seen = new Set<number>();
          return sortVisitsNewestFirst(
            merged.filter((visit) => {
              const id = Number(visit.id);
              if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return false;
              seen.add(id);
              return true;
            })
          );
        });
        setNextUrl(page.next);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("farmerDetail.visitHistoryError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [farmerId, loadingMore, nextUrl, t]
  );

  useEffect(() => {
    setVisits([]);
    setNextUrl(null);
    setLoading(true);
    void loadPage("initial");
    // farmerId drives a fresh first page; loadPage identity changes with nextUrl.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  const ordered = useMemo(() => sortVisitsNewestFirst(visits), [visits]);

  return (
    <ScreenEntranceShell style={styles.screen} withBrandHeader={false} deferCanvas>
      {() => (
        <SafeAreaView style={styles.flex} edges={["top"]}>
          <StackScreenHeader
            title={t("farmerDetail.visitHistory")}
            subtitle={farmerName || undefined}
            onBack={() => navigation.goBack()}
            includeSafeTop={false}
          />
          {loading && ordered.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.brand700} />
              <Text style={styles.muted}>{t("common.loading")}</Text>
            </View>
          ) : error && ordered.length === 0 ? (
            <ListStateView
              kind="error"
              title={t("farmerDetail.visitHistoryError")}
              subtitle={error}
              action={t("common.retry")}
              onAction={() => {
                setLoading(true);
                void loadPage("initial");
              }}
            />
          ) : (
            <FlashList
              data={ordered}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    void loadPage("refresh");
                  }}
                  {...refreshControlProps}
                />
              }
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (nextUrl) void loadPage("more");
              }}
              ListEmptyComponent={
                <ListStateView kind="empty" title={t("farmerDetail.noVisits")} compact />
              }
              ListFooterComponent={
                loadingMore ? <InlineSeedLoader label={t("farmerDetail.loadingMoreVisits")} /> : null
              }
              renderItem={({ item }) => (
                <VisitHistoryCard
                  visit={item}
                  onPress={() => {
                    const visitId = Number(item.id);
                    if (!Number.isFinite(visitId) || visitId <= 0) return;
                    navigation.push("VisitDetail", { id: visitId });
                  }}
                />
              )}
            />
          )}
        </SafeAreaView>
      )}
    </ScreenEntranceShell>
  );
}

export default function FarmerVisitHistoryScreen(props: Props) {
  return (
    <ScreenErrorBoundary screenName="FarmerVisitHistory">
      <FarmerVisitHistoryInner {...props} />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  flex: {
    flex: 1
  },
  list: {
    paddingBottom: 24,
    paddingHorizontal: Spacing.screen,
    paddingTop: 8
  },
  card: {
    gap: 6,
    marginBottom: 10,
    minHeight: 48,
    padding: 14
  },
  cardHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  date: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  line: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    lineHeight: 20
  },
  label: {
    color: Colors.text4,
    fontWeight: FontWeight.semibold
  },
  village: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  centered: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
    justifyContent: "center"
  },
  muted: {
    color: Colors.text3,
    fontSize: FontSize.sm
  }
});
