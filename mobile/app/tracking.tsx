import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
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
import { useDutyTimer } from "../../src/features/duty/hooks/useDutyTimer";
import { useDutyPresentation } from "../../src/features/duty/hooks/useDutyPresentation";
import { autoFlushPendingGps } from "../lib/sync/offlineSyncManager";
import { readPendingVisits } from "../lib/pendingVisitsQueue";
import { isSameVisitLocalDay } from "../../src/utils/format";
import { getHomeVisits } from "../../src/utils/visitsCache";
import { ScreenCanvas, ScreenEntranceBloom, ScreenPageHeader } from "../components/layout";
import { FadeInSection, entranceStagger } from "../components/ui/FadeInSection";
import {
  DutyMapCard,
  DutyStatusCard,
  DutySummary,
  DutyTimeline,
  WorkdayActionFooter
} from "../components/duty";
import { DutyNoWorkDayState } from "../components/duty/empty/DutyEmptyStates";
import { ScreenLoader } from "../components/layout/ScreenLoader";
import { useScreenEntrance } from "../hooks/useScreenEntrance";
import { fetchDashboard } from "../lib/homeApi";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../lib/theme";

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
  const { pendingCount, syncing } = useOfflineSync();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const {
    busy,
    pendingGpsCount,
    gpsEnabled,
    permissionDenied,
    refreshTrackingState
  } = useTracking();
  const { currentDuty, dutyMap, isOffline, refreshBootstrap, refreshDutyMap, endDuty } = useDuty();
  const dutyTimer = useDutyTimer();
  const dutyPresentation = useDutyPresentation(currentDuty);

  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [visitsToday, setVisitsToday] = useState(0);
  const [completedVisits, setCompletedVisits] = useState(0);
  const [queuedVisits, setQueuedVisits] = useState(0);
  const [failedVisits, setFailedVisits] = useState(0);
  const entranceTick = useScreenEntrance();

  const loadSummary = useCallback(async () => {
    try {
      const [mapSummary, visits, dashboard, pendingRows] = await Promise.all([
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
        }),
        readPendingVisits().catch(() => [])
      ]);

      logDayTabApi("duty_map", "tracking/duty/current/map/", true, `points=${mapSummary?.routePoints.length ?? 0}`);
      if (dashboard) {
        logDayTabApi("dashboard", "mobile/dashboard/", true, `visits_today=${dashboard.visits_today ?? 0}`);
      }

      const today = new Date();
      const todayVisits = (visits.visits ?? []).filter((v) => isSameVisitLocalDay(v, today));
      const pendingToday = pendingRows.filter((row: { createdAt: string }) =>
        isSameVisitLocalDay({ visit_date: row.createdAt, created_at: row.createdAt }, today)
      );

      const mapCompleted = mapSummary?.completedVisits ?? todayVisits.length;
      const mapQueued = mapSummary?.visitMarkers?.filter((m) => m.pending).length ?? 0;

      setVisitsToday(Number(dashboard?.visits_today) || todayVisits.length + pendingToday.length);
      setCompletedVisits(mapCompleted);
      setQueuedVisits(pendingToday.length + mapQueued);
      setFailedVisits(0);
    } catch (err) {
      logDayTabError("loadSummary", err);
      setVisitsToday(0);
      setCompletedVisits(0);
      setQueuedVisits(0);
      setFailedVisits(0);
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
    Alert.alert(t("daySummary.endWorkdayTitle"), t("daySummary.endWorkdayBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("daySummary.endWorkday"),
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

  function openVisit(visitId: number | string) {
    const id = typeof visitId === "string" ? Number(visitId) : visitId;
    if (!Number.isFinite(id)) return;
    navigation.navigate("Work", { screen: "VisitDetail", params: { id } });
  }

  const pendingSync = pendingGpsCount + pendingCount;
  const hasDuty = dutyPresentation.hasDuty;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <ScreenEntranceBloom replayKey={entranceTick} />
      <ScreenPageHeader title={t("daySummary.title")} subtitle={t("daySummary.reflectSubtitle")} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: dutyPresentation.isActive ? tabInset + 88 : tabInset + Layout.scrollBottomExtra }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} {...refreshControlProps} />
        }
      >
        {shouldShowExpoGoDevWarning() ? <ExpoGoDevBanner onBuildApk={openBuildApkPage} /> : null}

        {!hasDuty ? (
          <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
            <DutyNoWorkDayState />
          </FadeInSection>
        ) : (
          <>
            <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
              <DutyStatusCard
                sticky
                status={dutyPresentation.sessionStatus}
                startedAt={dutyPresentation.startedAt}
                expectedEndAt={dutyTimer.expectedEndAt}
                elapsed={dutyTimer.elapsedDisplay}
                remaining={dutyTimer.remainingDisplay}
                offline={isOffline}
                pendingSync={pendingSync}
                syncing={syncing}
                gpsEnabled={gpsEnabled}
                permissionDenied={permissionDenied}
              />
            </FadeInSection>

            <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)}>
              <DutyMapCard onMarkerPress={openVisit} />
            </FadeInSection>

            {summaryLoading ? (
              <ScreenLoader message={t("common.loading")} />
            ) : (
              <>
                <FadeInSection replayKey={entranceTick} delay={entranceStagger(2)}>
                  <DutySummary
                    visitsToday={visitsToday}
                    completed={completedVisits}
                    pendingSync={pendingSync}
                    queued={queuedVisits}
                    failed={failedVisits}
                  />
                </FadeInSection>

                <FadeInSection replayKey={entranceTick} delay={entranceStagger(3)}>
                  <DutyTimeline
                    startedAt={dutyPresentation.startedAt}
                    endedAt={dutyPresentation.endedAt}
                    visits={dutyMap?.visitMarkers ?? []}
                  />
                </FadeInSection>
              </>
            )}
          </>
        )}
      </ScrollView>

      <WorkdayActionFooter
        visible={dutyPresentation.isActive}
        loading={ending}
        disabled={busy}
        onEnd={() => void handleEndWorkday()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scroll: {
    flex: 1
  },
  content: {
    gap: 0,
    paddingTop: Spacing.sm
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
