import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { AlertTriangle, ClipboardList, Map, Users } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, RefreshControl, StyleSheet } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanOnlyMode } from "../../../src/hooks/useLanOnlyMode";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useI18n } from "../../../src/i18n/I18nContext";
import { announceA11y } from "../../../src/utils/a11yAnnounce";
import { useEmployee } from "../../../src/storage/EmployeeContext";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { useDutyTimer } from "../../../src/features/duty/hooks/useDutyTimer";
import { useDutyPresentation } from "../../../src/features/duty/hooks/useDutyPresentation";
import { extractPhotoUrl, photoCacheVersion } from "../../../src/utils/profilePhotoUrl";
import { autoFlushPendingGps } from "../../lib/sync/offlineSyncManager";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { ScreenCanvas, ScreenEntranceRipple } from "../../components/layout";
import {
  RecentActivitySection,
  TodayHeader,
  TodayStatsGrid,
  TodayQuickActions,
  type TodayQuickAction
} from "../../components/today";
import { OfflineBanner } from "../../components/ui";
import { SyncHealthIndicator } from "../../components/sync/SyncHealthIndicator";
import { ScreenLoader } from "../../components/layout/ScreenLoader";
import {
  ActiveWorkDayCard,
  CompletedWorkDayCard,
  HomeDashboardStatusRow,
  StartWorkDayCard
} from "../../components/duty";
import { readDashboardCache } from "../../lib/dashboardCache";
import { formatHeaderDate } from "../../lib/format";
import { fetchDashboard } from "../../lib/homeApi";
import { getBadgeCount } from "../../lib/notificationsApi";
import { useSyncStore } from "../../lib/store/syncStore";
import { useScreenTopEdges } from "../../hooks/useScreenTopEdges";
import { Colors, Layout, Spacing } from "../../lib/theme";
import { TODAY_SECTION_GAP } from "../../lib/todayLayout";
import type { DashboardData } from "../../lib/types";

function greetingKey(hour: number) {
  if (hour < 12) return "home.goodMorning";
  if (hour < 17) return "home.goodAfternoon";
  return "home.goodEvening";
}

export default function TodayTabScreen() {
  useSecureScreen();
  const { t } = useI18n();
  const topEdges = useScreenTopEdges();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollY = useSharedValue(0);
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const lanOnly = useLanOnlyMode();
  const { employee } = useEmployee();
  const { pendingCount, lastSyncAt, syncing } = useOfflineSync();
  const { visitsVersion } = useFieldDataRefresh();
  const {
    busy,
    error: trackingError,
    pendingGpsCount,
    gpsEnabled,
    permissionDenied,
    refreshTrackingState
  } = useTracking();
  const { hydrationStatus, currentDuty, dutyMap, isOffline, refreshBootstrap, refreshDutyMap, startDuty } = useDuty();
  const dutyTimer = useDutyTimer();
  const dutyPresentation = useDutyPresentation(currentDuty);
  const unreadNotifCount = useSyncStore((state) => state.unreadNotifCount);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [cacheHydrated, setCacheHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startPhase, setStartPhase] = useState<"idle" | "location" | "starting">("idle");
  const [gateError, setGateError] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState("");
  const dashboardRef = useRef<DashboardData | null>(null);
  dashboardRef.current = dashboard;
  const entranceTick = useScreenEntrance();
  const showOfflineBanner = lanOnly || isOffline;
  const headerStep = showOfflineBanner ? 1 : 0;
  const insightsStep = headerStep + 4;
  const actionsStep = insightsStep + 1;
  const activityStep = actionsStep + 1;

  const employeeName = employee?.full_name || employee?.name || employee?.username || null;
  const dateLabel = formatHeaderDate();
  const greeting = t(greetingKey(new Date().getHours()));
  const photoUrl = extractPhotoUrl(employee);
  const photoVersion = photoCacheVersion(employee) ?? Date.now();
  const pendingSync = pendingGpsCount + pendingCount;
  const visitsToday = dashboard?.visits_today ?? 0;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    }
  });

  const headerParallaxStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 180], [1, 0.88], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, 140], [0, -14], Extrapolation.CLAMP)
      }
    ]
  }));

  const contentParallaxStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, 200], [0, -8], Extrapolation.CLAMP)
      }
    ]
  }));

  useEffect(() => {
    void readDashboardCache().then((cached) => {
      if (cached) setDashboard(cached);
      setCacheHydrated(true);
    });
  }, []);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!dashboardRef.current) {
      setLoading(true);
    }
    try {
      const dash = await fetchDashboard({ force: isRefresh });
      setDashboard(dash);
      void getBadgeCount(true);
    } catch {
      const cachedDash = await readDashboardCache();
      if (cachedDash) setDashboard(cachedDash);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    void autoFlushPendingGps();
    void refreshTrackingState().catch(() => undefined);
    if (dutyPresentation.isActive || dutyPresentation.isCompleted) {
      void loadAll(false);
    }
  }, [dutyPresentation.isActive, dutyPresentation.isCompleted, loadAll, refreshTrackingState]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void autoFlushPendingGps();
      void refreshTrackingState().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refreshTrackingState]);

  useEffect(() => {
    if (visitsVersion > 0 && dutyPresentation.isActive) {
      void fetchDashboard({ force: true }).then(setDashboard).catch(() => undefined);
    }
  }, [dutyPresentation.isActive, visitsVersion]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      loadAll(true),
      refreshTrackingState().catch(() => undefined),
      refreshBootstrap({ force: true }).catch(() => undefined),
      refreshDutyMap().catch(() => undefined)
    ]);
  }

  async function handleStartWorkday() {
    if (busy || starting) return;
    setStarting(true);
    setGateError(null);
    setDismissedError("");
    setStartPhase("location");
    try {
      setStartPhase("starting");
      const started = await startDuty();
      if (!started) return;
      announceA11y(t("a11y.workdayStarted"));
      await Promise.all([
        refreshTrackingState().catch(() => undefined),
        refreshBootstrap({ force: true }).catch(() => undefined),
        refreshDutyMap().catch(() => undefined),
        loadAll(true)
      ]);
    } catch (error) {
      setGateError(error instanceof Error ? error.message : t("workdayUx.permissionBody"));
    } finally {
      setStarting(false);
      setStartPhase("idle");
    }
  }

  const visibleTrackingError = (() => {
    if (gateError) return gateError;
    if (!trackingError) return null;
    if (trackingError === dismissedError) return null;
    if (dutyPresentation.isActive) return null;
    return trackingError;
  })();

  const quickActions: TodayQuickAction[] = useMemo(
    () => [
      {
        key: "farmers",
        label: t("home.farmers"),
        subtitle: t("home.farmersSubtitle"),
        icon: Users,
        onPress: () => navigation.navigate("Work", { screen: "WorkHome", params: { segment: "queue" } })
      },
      {
        key: "visits",
        label: t("home.myVisits"),
        subtitle: t("home.myVisitsSubtitle"),
        icon: ClipboardList,
        onPress: () => navigation.navigate("Work", { screen: "WorkHome", params: { segment: "visits" } })
      },
      {
        key: "problems",
        label: t("home.problems"),
        subtitle: t("home.problemsSubtitle"),
        icon: AlertTriangle,
        onPress: () => navigation.navigate("Me", { screen: "ProblemsCatalog" })
      },
      {
        key: "routes",
        label: t("home.myRoutes"),
        subtitle: t("home.myRoutesSubtitle"),
        icon: Map,
        onPress: () => rootNav?.navigate("MyLocation")
      }
    ],
    [navigation, rootNav, t]
  );

  const recentVisits = dashboard?.recent_visits ?? [];
  const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : null;
  const showSkeleton = loading && !dashboard && cacheHydrated && dutyPresentation.isActive;
  const showWorkInsights = dutyPresentation.isActive;
  const hydrating = hydrationStatus === "loading" || hydrationStatus === "idle";

  return (
    <SafeAreaView style={styles.screen} edges={topEdges}>
      <ScreenCanvas />
      <ScreenEntranceRipple replayKey={entranceTick} />
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
        contentContainerStyle={[styles.content, { paddingBottom: tabInset + Layout.scrollBottomExtra }]}
      >
        {showOfflineBanner ? (
          <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
            <OfflineBanner
              pendingCount={pendingCount}
              lastSyncedAt={lastSyncDate}
              syncing={syncing}
              lanOnly={lanOnly}
              offline={lanOnly || isOffline}
            />
          </FadeInSection>
        ) : null}

        <SyncHealthIndicator onPress={() => rootNav?.navigate("SyncStatus")} />

        <Animated.View style={[styles.headerHeroZone, headerParallaxStyle]}>
          <TodayHeader
            greeting={greeting}
            name={employeeName}
            dateLabel={dateLabel}
            notificationCount={unreadNotifCount}
            onNotifications={() => rootNav?.navigate("Notifications")}
            entranceTick={entranceTick}
            entranceStep={headerStep}
            scrollY={scrollY}
          />
          {showSkeleton ? <ScreenLoader message={t("common.loading")} /> : null}
        </Animated.View>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(headerStep + 1)}>
          <HomeDashboardStatusRow
            photoUrl={photoUrl}
            photoVersion={photoVersion}
            offline={lanOnly || isOffline}
            pendingSync={pendingSync}
            gpsEnabled={gpsEnabled}
            permissionDenied={permissionDenied}
          />
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(headerStep + 2)}>
          {hydrating ? (
            <ScreenLoader message={t("workdayUx.loadingWorkday")} />
          ) : dutyPresentation.isActive ? (
            <ActiveWorkDayCard
              startedAt={dutyPresentation.startedAt}
              elapsed={dutyTimer.elapsedDisplay}
              remaining={dutyTimer.remainingDisplay}
              expectedEndAt={dutyTimer.expectedEndAt}
              visitsToday={visitsToday}
              farmersToday={dashboard?.farmers_covered ?? 0}
              distanceKm={dutyMap?.distanceKm ?? null}
              pendingSync={pendingSync}
              offline={lanOnly || isOffline}
              gpsEnabled={gpsEnabled}
              permissionDenied={permissionDenied}
              onOpenDay={() => navigation.navigate("Day")}
            />
          ) : dutyPresentation.isCompleted ? (
            <CompletedWorkDayCard
              elapsed={dutyTimer.elapsedDisplay}
              startedAt={dutyPresentation.startedAt}
              endedAt={dutyPresentation.endedAt}
              autoCompleted={dutyPresentation.sessionStatus === "auto_completed"}
            />
          ) : (
            <StartWorkDayCard
              loading={busy}
              starting={starting}
              startingLabel={
                startPhase === "location"
                  ? t("workdayUx.gettingLocation")
                  : startPhase === "starting"
                    ? t("workdayUx.startingWorkday")
                    : null
              }
              error={visibleTrackingError}
              onStart={() => void handleStartWorkday()}
              onDismissError={() => {
                setGateError(null);
                setDismissedError(trackingError || "");
              }}
              offline={lanOnly || isOffline}
              pendingSync={pendingSync}
              gpsEnabled={gpsEnabled}
              permissionDenied={permissionDenied}
            />
          )}
        </FadeInSection>

        {showWorkInsights ? (
          <Animated.View style={[styles.belowHero, contentParallaxStyle]}>
            <TodayStatsGrid
              dashboard={dashboard}
              farmersCovered={dashboard?.farmers_covered ?? 0}
              visitsSubtitle={t("home.visitsCompleted", { count: visitsToday })}
              farmersSubtitle={t("home.farmersTotal", { count: dashboard?.farmers_covered ?? 0 })}
              entrance={{ replayKey: entranceTick, sectionStep: insightsStep }}
            />

            <TodayQuickActions
              title={t("home.quickActions")}
              viewAllLabel={t("home.viewAll")}
              onViewAll={() => navigation.navigate("Work", { screen: "WorkHome", params: { segment: "queue" } })}
              actions={quickActions}
              entrance={{ replayKey: entranceTick, sectionStep: actionsStep }}
            />

            <RecentActivitySection
              title={t("home.recentActivity")}
              viewAllLabel={t("home.viewAll")}
              emptyLabel={t("home.noVisitsYet")}
              items={recentVisits}
              onViewAll={() => navigation.navigate("Work", { screen: "WorkHome", params: { segment: "visits" } })}
              onPressVisit={(id) => navigation.navigate("Work", { screen: "VisitDetail", params: { id } })}
              entrance={{ replayKey: entranceTick, sectionStep: activityStep }}
            />
          </Animated.View>
        ) : null}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scroll: {
    flex: 1,
    zIndex: 1
  },
  content: {
    flexGrow: 1,
    gap: 0,
    paddingBottom: Spacing.lg
  },
  headerHeroZone: {
    gap: 0
  },
  belowHero: {
    gap: TODAY_SECTION_GAP,
    paddingTop: TODAY_SECTION_GAP
  }
});
