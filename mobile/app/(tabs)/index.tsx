import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoRefreshIndicator } from "../../../src/components/ui/LogoRefreshIndicator";
import { useLanOnlyMode } from "../../../src/hooks/useLanOnlyMode";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useWorkdayTimer } from "../../../src/hooks/useLiveClock";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useEmployee } from "../../../src/storage/EmployeeContext";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import { updateCachedWorkdayMetrics } from "../../../src/storage/workdaySessionStorage";
import { resolveWorkdayStartedAt } from "../../../src/utils/workdayStartedAt";
import { requestGpsForFieldWork } from "../../../src/utils/locationRequiredModal";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { KavyaLoader } from "../../components/KavyaLoader";
import { ScreenCanvas, ScreenEntranceWash } from "../../components/layout";
import {
  RecentActivitySection,
  TodayHeader,
  TodayQuickActions,
  type TodayQuickAction
} from "../../components/today";
import { OfflineBanner } from "../../components/ui";
import { WorkdayHero } from "../../components/workday/WorkdayHero";
import { readDashboardCache } from "../../lib/dashboardCache";
import { formatHeaderDate, formatShortTime } from "../../lib/format";
import { fetchDashboard, fetchWorkStatus } from "../../lib/homeApi";
import { getBadgeCount } from "../../lib/notificationsApi";
import { useSyncStore } from "../../lib/store/syncStore";
import { Colors, Spacing } from "../../lib/theme";
import type { DashboardData, MobileWorkStatus } from "../../lib/types";

function greetingKey(hour: number) {
  if (hour < 12) return "home.goodMorning";
  if (hour < 17) return "home.goodAfternoon";
  return "home.goodEvening";
}

export default function TodayTabScreen() {
  useSecureScreen();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent();
  const scrollRef = useRef<ScrollView>(null);
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const lanOnly = useLanOnlyMode();
  const { employee } = useEmployee();
  const { pendingCount, syncAll, lastSyncAt } = useOfflineSync();
  const { visitsVersion } = useFieldDataRefresh();
  const {
    isActive,
    startedAt: trackingStartedAt,
    startDay,
    busy,
    refreshTracking,
    workday,
    workdaySyncStatus,
    cachedDistanceKm
  } = useTracking();
  const unreadNotifCount = useSyncStore((state) => state.unreadNotifCount);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [workStatus, setWorkStatus] = useState<MobileWorkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const entranceTick = useScreenEntrance();
  const showOfflineBanner = pendingCount > 0 || lanOnly;
  const headerStep = showOfflineBanner ? 1 : 0;
  const heroStep = headerStep + 1;
  const activityStep = heroStep + 1;
  const actionsStep = activityStep + 1;

  const workActive = isActive || Boolean(workStatus?.is_active);
  const startedAt = useMemo(
    () =>
      resolveWorkdayStartedAt(workday) ||
      trackingStartedAt ||
      resolveWorkdayStartedAt(workStatus) ||
      null,
    [trackingStartedAt, workStatus, workday]
  );
  const workdayTimer = useWorkdayTimer(startedAt, workActive);
  const distanceKm = workStatus?.distance_km ?? cachedDistanceKm ?? 0;

  const employeeName = employee?.full_name || employee?.name || employee?.username || null;
  const dateLabel = formatHeaderDate();
  const greeting = t(greetingKey(new Date().getHours()));

  const applyWorkStatus = useCallback((work: MobileWorkStatus) => {
    setWorkStatus(work);
    if (work.is_active) {
      void updateCachedWorkdayMetrics(work.distance_km ?? 0, work.route_points ?? 0);
    }
  }, []);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const [dash, work] = await Promise.all([fetchDashboard({ force: isRefresh }), fetchWorkStatus()]);
        setDashboard(dash);
        applyWorkStatus(work);
        void getBadgeCount(true);
      } catch {
        const cachedDash = await readDashboardCache();
        if (cachedDash) setDashboard(cachedDash);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyWorkStatus]
  );

  useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      void refreshTracking().catch(() => undefined);
      void fetchWorkStatus().then(applyWorkStatus).catch(() => undefined);
      void getBadgeCount(true);
      void fetchDashboard({ force: true }).then(setDashboard).catch(() => undefined);
    }, [applyWorkStatus, refreshTracking])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void refreshTracking().catch(() => undefined);
      void fetchWorkStatus().then(applyWorkStatus).catch(() => undefined);
    });
    return () => sub.remove();
  }, [applyWorkStatus, refreshTracking]);

  useEffect(() => {
    if (visitsVersion > 0) {
      void fetchDashboard({ force: true }).then(setDashboard).catch(() => undefined);
    }
  }, [visitsVersion]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadAll(true), refreshTracking().catch(() => undefined)]);
  }

  function confirmStartWorkday() {
    void (async () => {
      const allowed = await requestGpsForFieldWork();
      if (!allowed) return;
      await startDay();
      await refreshTracking().catch(() => undefined);
      void fetchWorkStatus().then(applyWorkStatus).catch(() => undefined);
    })();
  }

  const workdaySyncLabel =
    workActive && (workdaySyncStatus === "syncing" || workdaySyncStatus === "cached")
      ? t("home.syncing")
      : workActive && workdaySyncStatus === "connecting"
        ? t("home.connectingToServer")
        : null;

  const quickActions: TodayQuickAction[] = useMemo(
    () => [
      {
        key: "farmers",
        label: t("home.farmers"),
        icon: "people-outline",
        onPress: () => navigation.navigate("Work", { screen: "WorkHome", params: { segment: "queue" } })
      },
      {
        key: "visits",
        label: t("home.myVisits"),
        icon: "clipboard-outline",
        onPress: () => navigation.navigate("Work", { screen: "WorkHome", params: { segment: "visits" } })
      },
      {
        key: "problems",
        label: t("home.problems"),
        icon: "warning-outline",
        onPress: () => navigation.navigate("Me", { screen: "ProblemsCatalog" })
      },
      {
        key: "routes",
        label: t("home.myRoutes"),
        icon: "map-outline",
        onPress: () => rootNav?.navigate("TravelHistory")
      }
    ],
    [navigation, rootNav, t]
  );

  const recentVisits = dashboard?.recent_visits ?? [];
  const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : null;

  if (loading && !dashboard && !workActive) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScreenCanvas />
        <KavyaLoader fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <ScreenEntranceWash replayKey={entranceTick} />
      <LogoRefreshIndicator refreshing={refreshing} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
        contentContainerStyle={[styles.content, { paddingBottom: tabInset }]}
      >
        {showOfflineBanner ? (
          <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
            <OfflineBanner
              pendingCount={pendingCount}
              lastSyncedAt={lastSyncDate}
              onSync={() => void syncAll()}
              lanOnly={lanOnly}
              offline={lanOnly}
            />
          </FadeInSection>
        ) : null}

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(headerStep)}>
          <TodayHeader
            greeting={greeting}
            name={employeeName}
            dateLabel={dateLabel}
            subtitle={t("today.planSubtitle")}
            notificationCount={unreadNotifCount}
            onNotifications={() => rootNav?.navigate("Notifications")}
          />
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(heroStep)}>
          <View style={styles.heroWrap}>
            <WorkdayHero
            active={workActive}
            timerDisplay={workdayTimer.display}
            startedAtLabel={startedAt ? formatShortTime(startedAt) : null}
            distanceKm={distanceKm}
            lastSyncLabel={workdaySyncLabel}
            busy={busy}
            onStart={confirmStartWorkday}
            startLabel={t("home.startWorkday")}
            idleTitle={t("home.startWorkday")}
            idleSubtitle={t("home.startWorkdayBody")}
          />
          </View>
        </FadeInSection>

        <RecentActivitySection
          title={t("home.recentActivity")}
          viewAllLabel={t("home.viewAll")}
          emptyLabel={t("home.noVisitsYet")}
          items={recentVisits}
          onViewAll={() => navigation.navigate("Work", { screen: "WorkHome", params: { segment: "visits" } })}
          onPressVisit={(id) =>
            navigation.navigate("Work", { screen: "VisitDetail", params: { id } })
          }
          entrance={{ replayKey: entranceTick, sectionStep: activityStep }}
        />

        <TodayQuickActions
          title={t("home.quickActions")}
          actions={quickActions}
          entrance={{ replayKey: entranceTick, sectionStep: actionsStep }}
        />
      </ScrollView>
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
    flexGrow: 1,
    gap: 0,
    paddingBottom: Spacing.lg
  },
  heroWrap: {
    marginTop: Spacing.lg
  }
});
