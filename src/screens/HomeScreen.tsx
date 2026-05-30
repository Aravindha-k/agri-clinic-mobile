import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getFarmersForFieldWorker } from "../api/farmers";
import { Visit, getVisits } from "../api/visits";
import { HomeDashboardCards } from "../components/home/HomeDashboardCards";
import { HomeHeroCard } from "../components/home/HomeHeroCard";
import { WorkdayStatusCard } from "../components/home/WorkdayStatusCard";
import { OfflineConnectivityBanner } from "../components/OfflineConnectivityBanner";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useFieldWeather } from "../hooks/useFieldWeather";
import { useGpsCompliance } from "../storage/GpsComplianceContext";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { ErrorState } from "../components/ErrorState";
import { FadeInView } from "../components/FadeInView";
import { PremiumCard, SyncStatusBadge, VisitCard } from "../components/ui";
import { useEmployee } from "../storage/EmployeeContext";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { useOfflineSync } from "../storage/OfflineSyncContext";
import { useTracking } from "../storage/TrackingContext";
import { useTheme } from "../theme";
import { listCardType } from "../theme/listCard";
import { space } from "../theme/layout";
import { useRefreshControlProps } from "../hooks/useRefreshControlProps";
import { getForegroundLocation } from "../utils/location";
import { isSameVisitLocalDay, visitDisplayIso } from "../utils/format";
import { extractPhotoUrl, photoCacheVersion } from "../utils/profilePhotoUrl";

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const QUICK_ACTIONS = [
  { icon: "add-circle-outline" as const, label: "New visit", action: "visit" as const },
  { icon: "clipboard-outline" as const, label: "Visits", route: "Visits" as const, screen: "VisitsList" as const },
  { icon: "people-outline" as const, label: "Farmers", route: "Farmers" as const, screen: "FarmersList" as const },
  { icon: "navigate" as const, label: "Live map", route: "LiveMap" as const },
  { icon: "notifications-outline" as const, label: "Alerts", route: "Notifications" as const }
];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);
  const { theme } = useTheme();
  const c = theme.colors;
  const { employee, refreshEmployee } = useEmployee();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [farmerCount, setFarmerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [weatherLat, setWeatherLat] = useState<string | number | null>(null);
  const [weatherLng, setWeatherLng] = useState<string | number | null>(null);
  const { status: gpsComplianceStatus } = useGpsCompliance();
  const { pendingCount } = useOfflineSync();
  const {
    busy: trackingBusy,
    isActive,
    startedAt,
    lastSyncTime,
    nextSyncAt,
    currentLocation,
    pendingSyncCount,
    elapsedDuration,
    refreshTracking,
    startDay
  } = useTracking();
  const { visitsVersion, farmersVersion, employeePhotoVersion } = useFieldDataRefresh();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const {
    weather,
    loading: weatherLoading,
    error: weatherError,
    refresh: refreshWeather,
    iconName: weatherIcon
  } = useFieldWeather(weatherLat, weatherLng);

  const gpsLabel =
    gpsComplianceStatus === "active" ? "Active" : gpsComplianceStatus === "blocked" ? "Blocked" : "Required";
  const gpsTint =
    gpsComplianceStatus === "active" ? "success" : gpsComplianceStatus === "blocked" ? "warning" : ("primary" as const);

  const load = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      const [, visitRows, farmers] = await Promise.all([
        refreshEmployee(),
        getVisits(),
        getFarmersForFieldWorker().catch(() => [])
      ]);
      setVisits(visitRows);
      setFarmerCount(farmers.length);
      await refreshTracking().catch(() => undefined);
      await refreshWeather().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [refreshEmployee, refreshTracking, refreshWeather]);

  useEffect(() => {
    load(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      void refreshEmployee().catch(() => undefined);
    }, [refreshEmployee])
  );

  useEffect(() => {
    if (visitsVersion > 0 || farmersVersion > 0 || employeePhotoVersion > 0) {
      load(true);
    }
  }, [farmersVersion, employeePhotoVersion, load, visitsVersion]);

  useEffect(() => {
    if (currentLocation?.latitude && currentLocation?.longitude) {
      setWeatherLat(currentLocation.latitude);
      setWeatherLng(currentLocation.longitude);
      return;
    }
    void getForegroundLocation()
      .then((result) => {
        if (result.granted) {
          setWeatherLat(result.location.coords.latitude);
          setWeatherLng(result.location.coords.longitude);
        }
      })
      .catch(() => undefined);
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  async function onRefresh() {
    setRefreshing(true);
    await load(true);
  }

  async function handleStartDay() {
    try {
      await startDay();
      await refreshTracking();
    } catch {
      Alert.alert("Unable to start work", "Please check GPS and try again.");
    }
  }

  const today = useMemo(() => new Date(), []);
  const todayVisits = useMemo(() => visits.filter((v) => isSameVisitLocalDay(v, today)), [visits, today]);
  const recentVisits = useMemo(() => {
    return [...visits]
      .sort((a, b) => {
        const ta = visitDisplayIso(a) ? new Date(visitDisplayIso(a)!).getTime() : 0;
        const tb = visitDisplayIso(b) ? new Date(visitDisplayIso(b)!).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 3);
  }, [visits]);

  if (loading && !employee && visits.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <DashboardSkeleton />
      </View>
    );
  }

  if (error && !employee && visits.length === 0) {
    return <ErrorState message={error} onRetry={() => load(false)} />;
  }

  const displayName = employee?.full_name || employee?.name || employee?.username || "Field teammate";
  const roleLabel = employee?.role?.trim() || "Field staff";
  const rootNav = navigation.getParent();

  function openQuickAction(item: (typeof QUICK_ACTIONS)[number]) {
    if ("action" in item && item.action === "visit") {
      rootNav?.navigate("VisitFlow", { screen: "NewVisitFarmer" });
      return;
    }
    if ("route" in item) {
      if (item.route === "LiveMap" || item.route === "Notifications") {
        rootNav?.navigate(item.route);
        return;
      }
      navigation.navigate(item.route, item.screen ? { screen: item.screen } : undefined);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <OfflineConnectivityBanner onPressSync={() => rootNav?.navigate("OfflineSync")} />
      <ScrollView
        ref={scrollRef}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
        contentContainerStyle={[styles.screen, { paddingBottom: tabInset }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeroCard
          greeting={greetingForNow()}
          displayName={displayName}
          roleLabel={roleLabel}
          employeePhotoUrl={extractPhotoUrl(employee)}
          employeePhotoVersion={photoCacheVersion(employee, employeePhotoVersion)}
          weather={weather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          iconName={weatherIcon}
          onRetryWeather={() => void refreshWeather()}
          right={<SyncStatusBadge onPress={() => rootNav?.navigate("OfflineSync")} />}
        />

        <View style={styles.body}>
          <FadeInView delay={20}>
            <WorkdayStatusCard
              isActive={isActive}
              startedAt={startedAt}
              lastSyncTime={lastSyncTime}
              nextSyncAt={nextSyncAt}
              busy={trackingBusy}
              elapsedLabel={isActive ? elapsedDuration : undefined}
              onStart={handleStartDay}
              onLiveMap={() => rootNav?.navigate("LiveMap")}
            />
          </FadeInView>

          <FadeInView delay={50}>
            <HomeDashboardCards
              visitsToday={todayVisits.length}
              farmersCount={farmerCount}
              pendingVisitSync={pendingCount}
              pendingLocationPoints={pendingSyncCount}
              gpsLabel={gpsLabel}
              gpsTint={gpsTint}
              onFarmersPress={() => navigation.navigate("Farmers", { screen: "FarmersList" })}
              onSyncPress={() => rootNav?.navigate("OfflineSync")}
            />
          </FadeInView>

          {recentVisits.length > 0 ? (
            <FadeInView delay={90}>
              <View style={styles.sectionHead}>
                <Text style={[listCardType.title, { color: c.text }]}>Recent activity</Text>
                <Pressable onPress={() => navigation.navigate("Visits", { screen: "VisitsList" })}>
                  <Text style={[listCardType.caption, { color: c.primary }]}>See all</Text>
                </Pressable>
              </View>
              <View style={styles.recentVisits}>
                {recentVisits.map((v) => (
                  <VisitCard
                    key={v.id}
                    visit={v}
                    compact
                    onPress={() => navigation.navigate("Visits", { screen: "VisitDetail", params: { id: v.id } })}
                  />
                ))}
              </View>
            </FadeInView>
          ) : null}

          <FadeInView delay={120}>
            <Text style={[listCardType.title, { color: c.text }]}>Quick actions</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((item) => (
                <QuickTile key={item.label} icon={item.icon} label={item.label} onPress={() => openQuickAction(item)} />
              ))}
            </View>
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}

const QuickTile = memo(function QuickTile({
  icon,
  label,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickTile, pressed && styles.quickTilePressed]}
    >
      <PremiumCard elevated style={styles.quickTileInner}>
        <View style={[styles.quickIcon, { backgroundColor: c.primarySoft }]}>
          <Ionicons name={icon} size={22} color={c.primaryDark} />
        </View>
        <Text style={[listCardType.caption, { color: c.text }]} numberOfLines={1}>
          {label}
        </Text>
      </PremiumCard>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  body: { gap: space.md + 2, paddingHorizontal: space.lg, paddingTop: space.sm },
  sectionHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: space.xs
  },
  recentVisits: { gap: 10, marginTop: 8 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  quickTile: { width: "31%" },
  quickTilePressed: { opacity: 0.92 },
  quickTileInner: { alignItems: "center", gap: 8, minHeight: 78, paddingVertical: 10 },
  quickIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40
  }
});
