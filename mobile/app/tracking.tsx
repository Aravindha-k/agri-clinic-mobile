import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppErrorBoundary } from "../../src/components/AppErrorBoundary";
import { getExpoBuildUrl, shouldShowExpoGoDevWarning } from "../../src/utils/expoRuntime";
import { logDayTabApi, logDayTabError, logDayTabOpen } from "../../src/utils/dayTabDiagnostics";
import { useResponsiveLayout } from "../../src/hooks/useResponsiveLayout";
import { useTabBarBottomInset } from "../../src/hooks/useTabBarBottomInset";
import { useI18n } from "../../src/i18n/I18nContext";
import { useTracking } from "../../src/storage/TrackingContext";
import { useDuty } from "../../src/features/duty/store/DutyContext";
import { useDutyTimer } from "../../src/features/duty/hooks/useDutyTimer";
import { useDutyPresentation } from "../../src/features/duty/hooks/useDutyPresentation";
import { autoFlushPendingGps } from "../lib/sync/offlineSyncManager";
import { readPendingVisits, type PendingVisitRecord } from "../lib/pendingVisitsQueue";
import { isSameVisitLocalDay } from "../../src/utils/format";
import { getHomeVisits } from "../../src/utils/visitsCache";
import { ScreenCanvas, ScreenPageHeader } from "../components/layout";
import { DutyMapCard } from "../components/duty";
import { DayCompactSummary } from "../components/duty/DayCompactSummary";
import { DutyNoWorkDayState } from "../components/duty/empty/DutyEmptyStates";
import { PendingVisitDetail } from "../components/visits/PendingVisitDetail";
import { fetchDashboard } from "../lib/homeApi";
import { Colors, FontSize, FontWeight, Spacing } from "../lib/theme";

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
  const tabInset = useTabBarBottomInset();
  const { compactHeight, dayMapMinHeight } = useResponsiveLayout();
  const { gpsEnabled, permissionDenied, refreshTrackingState } = useTracking();
  const { currentDuty, dutyMap, refreshBootstrap, refreshDutyMap } = useDuty();
  const dutyTimer = useDutyTimer();
  const dutyPresentation = useDutyPresentation(currentDuty);

  const [visitsCompleted, setVisitsCompleted] = useState(0);
  const [farmersCovered, setFarmersCovered] = useState(0);
  const [pendingDetail, setPendingDetail] = useState<PendingVisitRecord | null>(null);

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
      const visitsCount =
        Number(dashboard?.visits_today) || todayVisits.length + pendingToday.length || mapCompleted;

      setVisitsCompleted(Math.max(0, visitsCount));
      setFarmersCovered(Math.max(0, Number(dashboard?.farmers_covered) || 0));
    } catch (err) {
      logDayTabError("loadSummary", err);
      setVisitsCompleted(0);
      setFarmersCovered(0);
    }
  }, [dutyMap, refreshDutyMap]);

  useFocusEffect(
    useCallback(() => {
      logDayTabOpen();
      void autoFlushPendingGps();
      void loadSummary();
      void refreshTrackingState().catch(() => undefined);
      void refreshBootstrap({ force: false }).catch(() => undefined);
    }, [loadSummary, refreshBootstrap, refreshTrackingState])
  );

  function openBuildApkPage() {
    void Linking.openURL(getExpoBuildUrl()).catch(() => undefined);
  }

  function openVisit(visitId: number | string) {
    const id = typeof visitId === "string" ? Number(visitId) : visitId;
    if (!Number.isFinite(id)) return;
    navigation.navigate("Work", { screen: "VisitDetail", params: { id } });
  }

  async function openPending(localSyncId: string) {
    const rows = await readPendingVisits().catch(() => []);
    const match = rows.find((row) => row.local_sync_id === localSyncId) ?? null;
    setPendingDetail(match);
  }

  const hasDuty = dutyPresentation.hasDuty;
  const statusLabel = dutyPresentation.isActive
    ? t("workdayUx.workdayActive")
    : dutyPresentation.isCompleted
      ? dutyPresentation.sessionStatus === "auto_completed"
        ? "Auto Completed"
        : t("workdayUx.statusCompleted")
      : t("workdayUx.statusNotStarted");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <ScreenPageHeader title={t("daySummary.title")} subtitle={t("daySummary.reflectSubtitle")} />

      {shouldShowExpoGoDevWarning() ? <ExpoGoDevBanner onBuildApk={openBuildApkPage} /> : null}

      {!hasDuty ? (
        <View style={styles.emptyWrap}>
          <DutyNoWorkDayState />
        </View>
      ) : (
        <View style={styles.body}>
          <DayCompactSummary
            statusLabel={statusLabel}
            startedAt={dutyPresentation.startedAt}
            expectedEndAt={dutyTimer.expectedEndAt}
            visitsCompleted={visitsCompleted}
            farmersCovered={farmersCovered}
            dutyActive={dutyPresentation.isActive}
            gpsEnabled={gpsEnabled}
            permissionDenied={permissionDenied}
            compact={compactHeight}
          />

          <View style={[styles.mapArea, { marginBottom: tabInset, minHeight: dayMapMinHeight }]}>
            <DutyMapCard
              fill
              hideTitle
              onMarkerPress={openVisit}
              onPendingMarkerPress={(id) => void openPending(id)}
            />
          </View>
        </View>
      )}

      <PendingVisitDetail
        visit={pendingDetail}
        onClose={() => setPendingDetail(null)}
        onChanged={() => void loadSummary()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  body: {
    flex: 1
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingTop: Spacing.lg
  },
  mapArea: {
    flex: 1,
    minHeight: 220
  },
  expoDevBanner: {
    backgroundColor: Colors.amberBg,
    borderColor: Colors.amber,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginBottom: Spacing.sm,
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
