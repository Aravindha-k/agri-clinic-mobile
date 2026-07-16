import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Linking,
  RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppErrorBoundary } from "../../src/components/AppErrorBoundary";
import { getExpoBuildUrl, shouldShowExpoGoDevWarning } from "../../src/utils/expoRuntime";
import { logDayTabApi, logDayTabError, logDayTabOpen } from "../../src/utils/dayTabDiagnostics";
import { useRefreshControlProps } from "../../src/hooks/useRefreshControlProps";
import { useTabBarBottomInset } from "../../src/hooks/useTabBarBottomInset";
import { useI18n } from "../../src/i18n/I18nContext";
import { useOfflineSync } from "../../src/storage/OfflineSyncContext";
import { useTracking } from "../../src/storage/TrackingContext";
import { useDuty } from "../../src/features/duty/store/DutyContext";
import { navigateMyLocation } from "../../src/navigation/rootNavigationRef";
import { autoFlushPendingGps } from "../lib/sync/offlineSyncManager";
import { readPendingVisits } from "../lib/pendingVisitsQueue";
import { isSameVisitLocalDay } from "../../src/utils/format";
import { getHomeVisits } from "../../src/utils/visitsCache";
import { DaySummaryRouteCard } from "../components/daySummary/DaySummaryRouteCard";
import { ScreenCanvas, ScreenEntranceBloom, ScreenPageHeader } from "../components/layout";
import { FadeInSection, entranceStagger } from "../components/ui/FadeInSection";
import { RecentActivitySection } from "../components/today/RecentActivitySection";
import { TodayKpiRow } from "../components/today/TodayKpiRow";
import { WorkdayStartPanel } from "../components/workday/WorkdayStartPanel";
import { ScreenLoader } from "../components/layout/ScreenLoader";
import { useScreenEntrance } from "../hooks/useScreenEntrance";
import {
  countVillagesFromVisitsToday,
  fetchDashboard
} from "../lib/homeApi";
import { formatDistanceKm, formatShortTime } from "../lib/format";
import type { DashboardRecentVisit } from "../lib/types";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../lib/theme";
import { useDutyTimer } from "../../src/features/duty/hooks/useDutyTimer";

function formatStartedTime(startedAt: string | null) {
  if (!startedAt) return null;
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return null;
  return formatShortTime(startedAt);
}

function ExpoGoDevBanner({ onBuildApk }: { onBuildApk: () => void }) {
  return (
    <View style={styles.expoDevBanner}>
      <Text style={styles.expoDevTitle}>Expo Go — limited background GPS</Text>
      <Text style={styles.expoDevBody}>Use a dev build for full route recording.</Text>
      <Pressable onPress={onBuildApk} style={styles.expoDevLink}>
        <Text style={styles.expoDevLinkText}>Open builds</Text>
      </Pressable>
    </View>
  );
}

export default function TrackingWorkspaceScreen() {
  return (
    <AppErrorBoundary>
      <TrackingWorkspaceScreenInner />
    </AppErrorBoundary>
  );
}

function TrackingWorkspaceScreenInner() {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const { pendingCount } = useOfflineSync();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const {
    busy,
    error: trackingError,
    pendingGpsCount,
    refreshTrackingState
  } = useTracking();
  const { currentDuty, dutyMap, refreshBootstrap, refreshDutyMap, endDuty } = useDuty();
  const dutyTimer = useDutyTimer();

  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [visitsToday, setVisitsToday] = useState(0);
  const [farmersCovered, setFarmersCovered] = useState(0);
  const [villagesCovered, setVillagesCovered] = useState(0);
  const [recentVisits, setRecentVisits] = useState<DashboardRecentVisit[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const entranceTick = useScreenEntrance();

  const startedAt = currentDuty?.start_time ?? currentDuty?.started_at ?? null;

  const loadSummary = useCallback(async () => {
    try {
      const [mapSummary, visits, dashboard] = await Promise.all([
        refreshDutyMap().catch((err) => {
          logDayTabApi("duty_map", "tracking/duty/current/map/", false, err instanceof Error ? err.message : String(err));
          return dutyMap;
        }),
        getHomeVisits({ pageSize: 100 }).catch((err) => {
          logDayTabError("visits", err);
          return { visits: [] };
        }),
        fetchDashboard().catch((err) => {
          logDayTabApi("dashboard", "mobile/dashboard/", false, err instanceof Error ? err.message : String(err));
          return null;
        })
      ]);

      logDayTabApi("duty_map", "tracking/duty/current/map/", true, `points=${mapSummary?.routePoints.length ?? 0}`);
      if (dashboard) {
        logDayTabApi("dashboard", "mobile/dashboard/", true, `visits_today=${dashboard.visits_today ?? 0}`);
      }

      setDistanceKm(Number(mapSummary?.distanceKm) || 0);

      const today = new Date();
      const todayVisits = (visits.visits ?? []).filter((v) => isSameVisitLocalDay(v, today));

      let pendingToday = 0;
      try {
        pendingToday = (await readPendingVisits()).filter((row: { createdAt: string }) =>
          isSameVisitLocalDay({ visit_date: row.createdAt, created_at: row.createdAt }, today)
        ).length;
      } catch (err) {
        logDayTabError("pending_visits", err);
      }

      setVisitsToday((Number(dashboard?.visits_today) || todayVisits.length) + pendingToday);
      setFarmersCovered(
        Number(dashboard?.farmers_covered) ||
          new Set(todayVisits.map((v) => v.farmer?.id ?? v.farmer_name)).size
      );
      setVillagesCovered(countVillagesFromVisitsToday(visits.visits ?? []));

      const recent = (dashboard?.recent_visits?.length
        ? dashboard.recent_visits
        : todayVisits
            .slice()
            .sort((a, b) => {
              const ta = a.visit_date || a.created_at || "";
              const tb = b.visit_date || b.created_at || "";
              return tb.localeCompare(ta);
            })
            .slice(0, 5)
            .map((v) => ({
              id: v.id,
              farmer_name: v.farmer_name || v.farmer?.name || "Farmer",
              crop: v.crop_name || v.crop,
              visited_at: v.visit_date || v.created_at
            }))) as DashboardRecentVisit[];

      setRecentVisits(recent);
    } catch (err) {
      logDayTabError("loadSummary", err);
      setDistanceKm(0);
      setVisitsToday(0);
      setFarmersCovered(0);
      setVillagesCovered(0);
      setRecentVisits([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [dutyMap, refreshDutyMap]);

  useFocusEffect(
    useCallback(() => {
      logDayTabOpen();
      void autoFlushPendingGps();
      void loadSummary();
      void refreshTrackingState().catch(() => undefined);
    }, [loadSummary, refreshTrackingState])
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      loadSummary(),
      refreshTrackingState().catch(() => undefined),
      refreshBootstrap({ force: true }).catch(() => undefined)
    ]);
    setRefreshing(false);
  }

  async function handleEndWorkday() {
    if (busy || ending) return;
    Alert.alert(t("home.endWorkdayTitle"), t("home.endWorkdayBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("home.endWorkday"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            setEnding(true);
            try {
              await endDuty();
              await refreshTrackingState().catch(() => undefined);
              await loadSummary();
            } finally {
              setEnding(false);
            }
          })();
        }
      }
    ]);
  }

  function openBuildApkPage() {
    void Linking.openURL(getExpoBuildUrl()).catch(() => undefined);
  }
  const displayDistanceKm = distanceKm || Number(dutyMap?.distanceKm) || 0;
  const workdayStatus = currentDuty?.is_active
    ? "active"
    : currentDuty?.ended_at || currentDuty?.end_time || currentDuty?.is_active === false
      ? "completed"
      : "not_started";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <ScreenEntranceBloom replayKey={entranceTick} />
      <ScreenPageHeader
        title={t("daySummary.title")}
        subtitle={t("daySummary.reflectSubtitle")}
      />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabInset + Layout.scrollBottomExtra }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} {...refreshControlProps} />
        }
      >
        {pendingCount > 0 ? (
          <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
            <Text style={styles.pendingHint}>
              {t(pendingCount === 1 ? "visitFlow.visitsInQueue" : "visitFlow.visitsInQueue_plural", {
                count: pendingCount
              })}
            </Text>
          </FadeInSection>
        ) : null}

        {shouldShowExpoGoDevWarning() ? <ExpoGoDevBanner onBuildApk={openBuildApkPage} /> : null}

        {currentDuty ? (
          <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)}>
            <WorkdayStartPanel
              workdayStatus={workdayStatus as any}
              presentation="tracking"
              hydrating={false}
              active
              busy={busy}
              ending={ending}
              error={trackingError || null}
              errorSource={trackingError ? "start_workday" : null}
              timerDisplay={dutyTimer.elapsedDisplay}
              startedAtLabel={formatStartedTime(startedAt)}
              distanceKm={displayDistanceKm}
              visitsToday={visitsToday}
              pendingSync={pendingGpsCount + pendingCount}
              showVisitActions={false}
              onStart={() => undefined}
              onEnd={currentDuty.is_active ? () => void handleEndWorkday() : undefined}
              onMyRoute={() => navigateMyLocation()}
            />
          </FadeInSection>
        ) : (
          <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{t("myLocation.empty.noWorkday")}</Text>
              <Text style={styles.emptyBody}>{t("daySummary.reflectSubtitle")}</Text>
            </View>
          </FadeInSection>
        )}

        {summaryLoading ? (
          <ScreenLoader message={t("common.loading")} />
        ) : (
          <>
        <FadeInSection replayKey={entranceTick} delay={entranceStagger(2)}>
          <TodayKpiRow
          items={[
            {
              key: "visits",
              label: t("daySummary.visitsCompleted"),
              value: visitsToday,
              icon: "clipboard-outline",
              tint: Colors.brand700,
              bg: Colors.brand50
            },
            {
              key: "farmers",
              label: t("daySummary.farmersCovered"),
              value: farmersCovered,
              icon: "people-outline",
              tint: Colors.blueText,
              bg: Colors.blueBg
            },
            {
              key: "villages",
              label: t("daySummary.villagesCovered"),
              value: villagesCovered,
              icon: "location-outline",
              tint: Colors.amberText,
              bg: Colors.amberBg
            }
          ]}
        />
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(3)}>
          <DaySummaryRouteCard
          title={t("daySummary.routeSummary")}
          distanceLabel={t("daySummary.totalRouteDistance")}
          distanceValue={`${formatDistanceKm(displayDistanceKm)} km`}
          workdayId={currentDuty?.workday_id}
          dutySessionId={currentDuty?.duty_session_id}
          refreshToken={dutyMap?.raw ? JSON.stringify(dutyMap.raw).slice(0, 32) : null}
          onPress={() => navigateMyLocation()}
        />
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(4)}>
          <RecentActivitySection
          title={t("daySummary.recentVisits")}
          viewAllLabel={t("home.viewAll")}
          emptyLabel={t("daySummary.noVisitsYet")}
          items={recentVisits.slice(0, 5)}
          onViewAll={() =>
            navigation.navigate("Work", { screen: "WorkHome", params: { segment: "visits" } })
          }
          onPressVisit={(id) =>
            navigation.navigate("Work", { screen: "VisitDetail", params: { id } })
          }
        />
        </FadeInSection>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  pendingHint: {
    color: Colors.amberText,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md
  },
  scroll: {
    flex: 1
  },
  content: {
    gap: 0
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg
  },
  emptyTitle: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  emptyBody: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    marginTop: 6
  },
  expoDevBanner: {
    backgroundColor: Colors.amberBg,
    borderColor: Colors.amber,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: 12
  },
  expoDevTitle: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  expoDevBody: {
    color: Colors.amberText,
    fontSize: FontSize.xs
  },
  expoDevLink: {
    alignSelf: "flex-start",
    marginTop: 4
  },
  expoDevLinkText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  }
});
