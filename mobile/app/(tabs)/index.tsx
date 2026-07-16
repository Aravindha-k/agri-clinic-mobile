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
import { useEmployee } from "../../../src/storage/EmployeeContext";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { useDutyTimer } from "../../../src/features/duty/hooks/useDutyTimer";
import type { TrackingErrorSource } from "../../../src/types/trackingError";
import { formatShortTime } from "../../lib/format";
import { autoFlushPendingGps } from "../../lib/sync/offlineSyncManager";
import { useFieldWeather } from "../../../src/hooks/useFieldWeather";
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
import { WorkdayStartPanel } from "../../components/workday/WorkdayStartPanel";
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

function parseCoord(value?: string | null) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
    currentLocation,
    busy,
    error: trackingError,
    pendingGpsCount,
    refreshTrackingState
  } = useTracking();
  const { hydrationStatus, currentDuty, dutyMap, refreshBootstrap, refreshDutyMap, startDuty } = useDuty();
  const dutyTimer = useDutyTimer();
  const unreadNotifCount = useSyncStore((state) => state.unreadNotifCount);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [cacheHydrated, setCacheHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startPhase, setStartPhase] = useState<"idle" | "location" | "starting">("idle");
  const [gateError, setGateError] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState("");
  const [dismissedErrorSource, setDismissedErrorSource] = useState<TrackingErrorSource | null>(null);
  const trackingErrorSource: TrackingErrorSource | null = trackingError ? "start_workday" : null;
  const dashboardRef = useRef<DashboardData | null>(null);
  dashboardRef.current = dashboard;
  const entranceTick = useScreenEntrance();
  const showOfflineBanner = lanOnly;
  const headerStep = showOfflineBanner ? 1 : 0;
  const planStep = headerStep + 3;
  const insightsStep = planStep + 1;
  const actionsStep = insightsStep + 1;
  const activityStep = actionsStep + 1;

  const weatherLat = parseCoord(currentLocation?.latitude);
  const weatherLng = parseCoord(currentLocation?.longitude);
  const { weather: fieldWeather, loading: weatherLoading } = useFieldWeather(weatherLat, weatherLng);

  const employeeName = employee?.full_name || employee?.name || employee?.username || null;
  const dateLabel = formatHeaderDate();
  const greeting = t(greetingKey(new Date().getHours()));

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
      if (cached) {
        setDashboard(cached);
      }
      setCacheHydrated(true);
    });
  }, []);

  const loadAll = useCallback(
    async (isRefresh = false) => {
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
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    void autoFlushPendingGps();
    void refreshTrackingState().catch(() => undefined);
    void loadAll(false);
  }, [loadAll, refreshTrackingState]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void autoFlushPendingGps();
      void refreshTrackingState().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refreshTrackingState]);

  useEffect(() => {
    if (visitsVersion > 0) {
      void fetchDashboard({ force: true }).then(setDashboard).catch(() => undefined);
    }
  }, [visitsVersion]);

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
    if (gateError) return { message: gateError, source: "start_workday" as const };
    if (!trackingError) return null;
    if (trackingError === dismissedError && trackingErrorSource === dismissedErrorSource) return null;
    if (currentDuty?.is_active) return null;
    return trackingError ? { message: trackingError, source: "start_workday" as const } : null;
  })();

  const startedAtLabel = currentDuty?.start_time ? formatShortTime(currentDuty.start_time) : null;
  const workdayStatus = currentDuty?.is_active
    ? "active"
    : currentDuty?.ended_at || currentDuty?.end_time || currentDuty?.is_active === false
      ? "completed"
      : "not_started";

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
  const showSkeleton = loading && !dashboard && cacheHydrated;
  const showContent = !showSkeleton;

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
              offline={lanOnly}
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

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)}>
          <WorkdayStartPanel
            presentation="dashboard"
            workdayStatus={workdayStatus as any}
            hydrating={hydrationStatus === "loading" || hydrationStatus === "idle"}
            active={Boolean(currentDuty)}
            busy={busy}
            starting={starting}
            startingLabel={
              startPhase === "location"
                ? t("workdayUx.gettingLocation")
                : startPhase === "starting"
                  ? t("workdayUx.startingWorkday")
                  : null
            }
            error={visibleTrackingError?.message ?? null}
            errorSource={visibleTrackingError?.source ?? null}
            onDismissError={() => {
              setGateError(null);
              setDismissedError(trackingError || "");
              setDismissedErrorSource("start_workday");
            }}
            timerDisplay={dutyTimer.elapsedDisplay}
            startedAtLabel={startedAtLabel}
            distanceKm={Number(dutyMap?.distanceKm) || 0}
            visitsToday={dashboard?.visits_today ?? 0}
            pendingSync={pendingGpsCount + pendingCount}
            onStart={() => void handleStartWorkday()}
            onMyRoute={() => rootNav?.navigate("MyLocation")}
            onOpenTracking={() => navigation.navigate("Day")}
          />
        </FadeInSection>

        {showContent ? (
          <Animated.View style={[styles.belowHero, contentParallaxStyle]}>
            <TodayStatsGrid
              dashboard={dashboard}
              farmersCovered={dashboard?.farmers_covered ?? 0}
              weather={fieldWeather}
              weatherLoading={weatherLoading}
              visitsSubtitle={t("home.visitsCompleted", { count: dashboard?.visits_today ?? 0 })}
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
              onPressVisit={(id) =>
                navigation.navigate("Work", { screen: "VisitDetail", params: { id } })
              }
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
