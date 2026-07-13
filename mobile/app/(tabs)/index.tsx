import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { AlertTriangle, ClipboardList, Map, Users } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, RefreshControl, StyleSheet, View } from "react-native";
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
import { autoFlushPendingGps } from "../../lib/sync/offlineSyncManager";
import { updateCachedWorkdayMetrics } from "../../../src/storage/workdaySessionStorage";
import {
  ensureLocationForWorkdayStart
} from "../../../src/utils/workdayLocationGate";
import { workdayStartGateCopy } from "../../../src/utils/workdayStartCopy";
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
import { WorkdayInactiveBanner } from "../../../src/components/WorkdayInactiveBanner";
import { OfflineBanner } from "../../components/ui";
import { SyncHealthIndicator } from "../../components/sync/SyncHealthIndicator";
import { WorkdayStartPanel } from "../../components/workday/WorkdayStartPanel";
import { ScreenLoader } from "../../components/layout/ScreenLoader";
import { readDashboardCache } from "../../lib/dashboardCache";
import { formatHeaderDate } from "../../lib/format";
import { fetchDashboard, fetchWorkStatus } from "../../lib/homeApi";
import { getBadgeCount } from "../../lib/notificationsApi";
import { useSyncStore } from "../../lib/store/syncStore";
import { useScreenTopEdges } from "../../hooks/useScreenTopEdges";
import { Colors, Layout, Spacing } from "../../lib/theme";
import { TODAY_SECTION_GAP } from "../../lib/todayLayout";
import type { TrackingErrorSource } from "../../../src/types/trackingError";
import type { DashboardData, MobileWorkStatus } from "../../lib/types";

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
    isActive,
    startDay,
    busy,
    error: trackingError,
    errorSource: trackingErrorSource,
    refreshTracking,
    currentLocation
  } = useTracking();
  const unreadNotifCount = useSyncStore((state) => state.unreadNotifCount);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [workStatus, setWorkStatus] = useState<MobileWorkStatus | null>(null);
  const [cacheHydrated, setCacheHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startPhase, setStartPhase] = useState<"idle" | "location" | "starting">("idle");
  const [gateError, setGateError] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState("");
  const [dismissedErrorSource, setDismissedErrorSource] = useState<TrackingErrorSource | null>(null);
  const dashboardRef = useRef<DashboardData | null>(null);
  dashboardRef.current = dashboard;
  const entranceTick = useScreenEntrance();
  const showOfflineBanner = lanOnly;
  const headerStep = showOfflineBanner ? 1 : 0;
  const heroStep = headerStep + 3;
  const planStep = heroStep + 1;
  const insightsStep = planStep + 1;
  const actionsStep = insightsStep + 1;
  const activityStep = actionsStep + 1;

  const weatherLat = parseCoord(currentLocation?.latitude);
  const weatherLng = parseCoord(currentLocation?.longitude);
  const { weather: fieldWeather, loading: weatherLoading } = useFieldWeather(weatherLat, weatherLng);

  const workActive = isActive || Boolean(workStatus?.is_active);

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

  const applyWorkStatus = useCallback((work: MobileWorkStatus) => {
    setWorkStatus(work);
    if (work.is_active) {
      void updateCachedWorkdayMetrics(work.distance_km ?? 0, work.route_points ?? 0);
    }
  }, []);

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

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    void autoFlushPendingGps();
    void refreshTracking().catch(() => undefined);
    void loadAll(false);
  }, [loadAll, refreshTracking]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void autoFlushPendingGps();
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

  const visibleTrackingError = (() => {
    if (gateError) {
      return { message: gateError, source: "start_workday" as const };
    }
    if (!trackingError) {
      return null;
    }
    if (trackingError === dismissedError && trackingErrorSource === dismissedErrorSource) {
      return null;
    }
    if (!workActive && trackingErrorSource && trackingErrorSource !== "start_workday") {
      return null;
    }
    if (workActive && trackingErrorSource === "start_workday") {
      return null;
    }
    if (workActive && trackingErrorSource === "end_workday") {
      return null;
    }
    return { message: trackingError, source: trackingErrorSource };
  })();

  function confirmStartWorkday() {
    if (busy || starting) return;
    void (async () => {
      setStarting(true);
      setGateError(null);
      setDismissedError("");
      setStartPhase("location");
      try {
        const gate = await ensureLocationForWorkdayStart(workdayStartGateCopy(t));
        if (!gate.ok) {
          if (gate.reason === "services_cancelled") {
            setGateError(t("workdayUx.servicesOffBody"));
          } else if (gate.reason === "permission_required") {
            setGateError(t("workdayUx.permissionBody"));
          } else if (gate.reason === "permission_blocked") {
            setGateError(t("workdayUx.permissionBlockedBody"));
          } else if (gate.reason === "services_unavailable") {
            setGateError(t("workdayUx.servicesResolutionUnavailable"));
          }
          return;
        }
        setStartPhase("starting");
        const started = await startDay();
        if (!started) return;
        await refreshTracking().catch(() => undefined);
        void fetchWorkStatus().then(applyWorkStatus).catch(() => undefined);
      } finally {
        setStarting(false);
        setStartPhase("idle");
      }
    })();
  }

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
          {!workActive ? (
            <FadeInSection replayKey={entranceTick} delay={entranceStagger(heroStep)} duration={280}>
              <View style={styles.workdaySection}>
                <WorkdayStartPanel
                  active={false}
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
                    setDismissedErrorSource(trackingErrorSource);
                  }}
                  timerDisplay=""
                  onStart={confirmStartWorkday}
                  onRetryStart={confirmStartWorkday}
                  onNewVisit={() =>
                    rootNav?.navigate("VisitFlow", {
                      screen: "NewVisitFarmer",
                      params: { fresh: true }
                    })
                  }
                  onFarmers={() =>
                    navigation.navigate("Work", { screen: "WorkHome", params: { segment: "queue" } })
                  }
                  onMyRoute={() => rootNav?.navigate("MyLocation")}
                />
              </View>
            </FadeInSection>
          ) : null}

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

          <WorkdayInactiveBanner />

          {showSkeleton ? <ScreenLoader message={t("common.loading")} /> : null}
        </Animated.View>

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
  workdaySection: {
    marginTop: TODAY_SECTION_GAP
  },
  belowHero: {
    gap: TODAY_SECTION_GAP,
    paddingTop: TODAY_SECTION_GAP
  }
});
