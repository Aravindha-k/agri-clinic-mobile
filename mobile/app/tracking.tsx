import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getExpoBuildUrl, shouldShowExpoGoDevWarning } from "../../src/utils/expoRuntime";
import { useRefreshControlProps } from "../../src/hooks/useRefreshControlProps";
import { useWorkdayTimer } from "../../src/hooks/useLiveClock";
import { useSecureScreen } from "../../src/hooks/useSecureScreen";
import { useTabBarBottomInset } from "../../src/hooks/useTabBarBottomInset";
import { useI18n } from "../../src/i18n/I18nContext";
import { useOfflineSync } from "../../src/storage/OfflineSyncContext";
import { useTracking } from "../../src/storage/TrackingContext";
import { requestGpsForFieldWork } from "../../src/utils/locationRequiredModal";
import { isSameVisitLocalDay } from "../../src/utils/format";
import { getHomeVisits } from "../../src/utils/visitsCache";
import { resolveWorkdayStartedAt } from "../../src/utils/workdayStartedAt";
import { DaySummaryRouteCard } from "../components/daySummary/DaySummaryRouteCard";
import { ScreenCanvas, ScreenEntranceWash } from "../components/layout";
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
  useSecureScreen();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent();
  const { pendingCount } = useOfflineSync();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const {
    isActive,
    startedAt: trackingStartedAt,
    busy,
    startDay,
    workday,
    refreshTracking
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
    const [workStatus, visits, dashboard] = await Promise.all([
      fetchWorkStatus().catch(() => ({ is_active: isActive, distance_km: 0 })),
      getHomeVisits({ pageSize: 100 }).catch(() => ({ visits: [] })),
      fetchDashboard().catch(() => null)
    ]);

    setDistanceKm(workStatus.distance_km ?? 0);
    setWorkdayId("workday_id" in workStatus ? workStatus.workday_id : undefined);

    const today = new Date();
    const todayVisits = visits.visits.filter((v) => isSameVisitLocalDay(v, today));
    setVisitsToday(dashboard?.visits_today ?? todayVisits.length);
    setFarmersCovered(dashboard?.farmers_covered ?? new Set(todayVisits.map((v) => v.farmer?.id ?? v.farmer_name)).size);
    setVillagesCovered(countVillagesFromVisitsToday(visits.visits));

    const recent = (dashboard?.recent_visits?.length ? dashboard.recent_visits : visits.visits
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
  }, [isActive]);

  useFocusEffect(
    useCallback(() => {
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
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <ScreenEntranceWash replayKey={entranceTick} />
      <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("daySummary.title")}</Text>
          <Text style={styles.headerSubtitle}>{t("daySummary.reflectSubtitle")}</Text>
          {pendingCount > 0 ? (
            <Text style={styles.pendingHint}>
              {t(pendingCount === 1 ? "visitFlow.visitsInQueue" : "visitFlow.visitsInQueue_plural", {
                count: pendingCount
              })}
            </Text>
          ) : null}
        </View>
      </FadeInSection>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabInset + Spacing.xl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} {...refreshControlProps} />
        }
      >
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  header: {
    gap: 4,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md
  },
  headerTitle: {
    color: Colors.text1,
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold
  },
  headerSubtitle: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  pendingHint: {
    color: Colors.amberText,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2
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
