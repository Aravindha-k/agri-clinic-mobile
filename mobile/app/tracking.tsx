import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Pressable,
  Linking,
  RefreshControl
} from "react-native";
import { API_BASE_URL, buildApiUrl } from "../../src/api/config";
import { AppErrorBoundary } from "../../src/components/AppErrorBoundary";
import { getExpoBuildUrl, shouldShowExpoGoDevWarning } from "../../src/utils/expoRuntime";
import { logDayTabApi, logDayTabError, logDayTabOpen } from "../../src/utils/dayTabDiagnostics";
import { useRefreshControlProps } from "../../src/hooks/useRefreshControlProps";
import { useSafeAreaInsetsCompat } from "../../src/hooks/useSafeAreaInsetsCompat";
import { useWorkdayTimer } from "../../src/hooks/useLiveClock";
import { useSecureScreen } from "../../src/hooks/useSecureScreen";
import { useTabBarBottomInset } from "../../src/hooks/useTabBarBottomInset";
import { useI18n } from "../../src/i18n/I18nContext";
import { useOfflineSync } from "../../src/storage/OfflineSyncContext";
import { useTracking } from "../../src/storage/TrackingContext";
import { requestGpsForFieldWork } from "../../src/utils/locationRequiredModal";
import { autoFlushPendingGps } from "../lib/sync/offlineSyncManager";
import { readPendingVisits } from "../lib/pendingVisitsQueue";
import { isSameVisitLocalDay } from "../../src/utils/format";
import { getHomeVisits } from "../../src/utils/visitsCache";
import { resolveWorkdayStartedAt } from "../../src/utils/workdayStartedAt";
import { DaySummaryRouteCard } from "../components/daySummary/DaySummaryRouteCard";
import { HeaderHero, ScreenCanvas, ScreenEntranceBloom } from "../components/layout";
import { FadeInSection, entranceStagger } from "../components/ui/FadeInSection";
import { RecentActivitySection } from "../components/today/RecentActivitySection";
import { TodayKpiRow } from "../components/today/TodayKpiRow";
import { WorkdayHero } from "../components/workday/WorkdayHero";
import { useScreenEntrance } from "../hooks/useScreenEntrance";
import {
  countVillagesFromVisitsToday,
  fetchDashboard,
  fetchWorkStatus
} from "../lib/homeApi";
import { formatDistanceKm, formatShortTime } from "../lib/format";
import {
  HEADER_IMAGE_POSITION,
  resolveScreenHeaderHeight,
  SCREEN_HEADER_IMAGES
} from "../lib/screenHeaderImages";
import type { DashboardRecentVisit } from "../lib/types";
import { Colors, FontSize, FontWeight, Spacing } from "../lib/theme";

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
  useSecureScreen();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const { height: screenH } = useWindowDimensions();
  const headerHeroHeight = resolveScreenHeaderHeight(screenH);
  const { pendingCount } = useOfflineSync();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const {
    isActive,
    startedAt: trackingStartedAt,
    busy,
    startDay,
    workday,
    refreshTracking,
    lastSyncTime
  } = useTracking();

  const [refreshing, setRefreshing] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [workdayId, setWorkdayId] = useState<number | undefined>();
  const [visitsToday, setVisitsToday] = useState(0);
  const [farmersCovered, setFarmersCovered] = useState(0);
  const [villagesCovered, setVillagesCovered] = useState(0);
  const [recentVisits, setRecentVisits] = useState<DashboardRecentVisit[]>([]);
  const entranceTick = useScreenEntrance();

  const startedAt = useMemo(
    () => resolveWorkdayStartedAt(workday) || trackingStartedAt || null,
    [trackingStartedAt, workday]
  );
  const workdayTimer = useWorkdayTimer(startedAt, isActive);

  const loadSummary = useCallback(async () => {
    const workStatusUrl = buildApiUrl("mobile/work/status/", API_BASE_URL);
    const dashboardUrl = buildApiUrl("mobile/dashboard/", API_BASE_URL);

    try {
      const [workStatus, visits, dashboard] = await Promise.all([
        fetchWorkStatus().catch((err) => {
          logDayTabApi("work_status", workStatusUrl, false, err instanceof Error ? err.message : String(err));
          return { is_active: isActive, distance_km: 0 };
        }),
        getHomeVisits({ pageSize: 100 }).catch((err) => {
          logDayTabError("visits", err);
          return { visits: [] };
        }),
        fetchDashboard().catch((err) => {
          logDayTabApi("dashboard", dashboardUrl, false, err instanceof Error ? err.message : String(err));
          return null;
        })
      ]);

      logDayTabApi(
        "work_status",
        workStatusUrl,
        true,
        `active=${workStatus.is_active} km=${workStatus.distance_km ?? 0}`
      );
      if (dashboard) {
        logDayTabApi("dashboard", dashboardUrl, true, `visits_today=${dashboard.visits_today ?? 0}`);
      }

      setDistanceKm(Number(workStatus.distance_km) || 0);
      const nextWorkdayId =
        "workday_id" in workStatus && typeof workStatus.workday_id === "number"
          ? workStatus.workday_id
          : undefined;
      setWorkdayId(nextWorkdayId);

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
      setWorkdayId(undefined);
      setVisitsToday(0);
      setFarmersCovered(0);
      setVillagesCovered(0);
      setRecentVisits([]);
    }
  }, [isActive]);

  useFocusEffect(
    useCallback(() => {
      logDayTabOpen();
      void autoFlushPendingGps();
      void loadSummary();
      void refreshTracking().catch(() => undefined);
    }, [loadSummary, refreshTracking])
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadSummary(), refreshTracking().catch(() => undefined)]);
    setRefreshing(false);
  }

  async function handleStartWorkday() {
    const allowed = await requestGpsForFieldWork();
    if (!allowed) return;
    await startDay();
    await refreshTracking().catch(() => undefined);
    await loadSummary();
  }

  function openBuildApkPage() {
    void Linking.openURL(getExpoBuildUrl()).catch(() => undefined);
  }

  return (
    <View style={styles.screen}>
      <ScreenCanvas />
      <ScreenEntranceBloom replayKey={entranceTick} />
      <HeaderHero
        imageSource={SCREEN_HEADER_IMAGES.summary}
        height={headerHeroHeight}
        contentPosition={HEADER_IMAGE_POSITION.summary}
        title={t("daySummary.title")}
        subtitle={t("daySummary.reflectSubtitle")}
        showLogo
        safeTop={safeTop}
      />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabInset + Spacing.xl }]}
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

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)}>
          <WorkdayHero
          active={isActive}
          timerDisplay={workdayTimer.display}
          startedAtLabel={formatStartedTime(startedAt)}
          distanceKm={distanceKm}
          busy={busy}
          onStart={() => void handleStartWorkday()}
          startLabel={t("home.startWorkday")}
          idleTitle={t("daySummary.idleTitle")}
          idleSubtitle={t("daySummary.idleSubtitle")}
          statItems={
            isActive
              ? [
                  { label: t("daySummary.hoursWorked"), value: workdayTimer.display },
                  {
                    label: t("daySummary.distanceTravelled"),
                    value: `${formatDistanceKm(distanceKm)} km`
                  }
                ]
              : undefined
          }
        />
        </FadeInSection>

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
          distanceValue={`${formatDistanceKm(distanceKm)} km`}
          workdayId={workdayId}
          refreshToken={lastSyncTime}
          onPress={() => rootNav?.navigate("TravelHistory")}
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

      </ScrollView>
    </View>
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
