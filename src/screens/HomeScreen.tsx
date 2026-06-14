import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Visit } from "../api/visits";
import { PremiumQuickActions } from "../components/home/PremiumQuickActions";
import { PremiumStatusCard } from "../components/home/PremiumStatusCard";
import { MasterDataOfflineBanner } from "../components/MasterDataOfflineBanner";
import { OfflineExperienceBanner } from "../components/OfflineExperienceBanner";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useSafeAreaInsetsCompat } from "../hooks/useSafeAreaInsetsCompat";
import { useFieldWeather } from "../hooks/useFieldWeather";
import { useGpsCompliance } from "../storage/GpsComplianceContext";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { ErrorState } from "../components/ErrorState";
import { FadeInView } from "../components/FadeInView";
import { KpiCard, SyncStatusBadge, VisitCard } from "../components/ui";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { useEmployee } from "../storage/EmployeeContext";
import { useMasterData } from "../storage/MasterDataContext";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { useOfflineSync } from "../storage/OfflineSyncContext";
import { useTracking } from "../storage/TrackingContext";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { useLiveClock } from "../hooks/useLiveClock";
import { useRefreshControlProps } from "../hooks/useRefreshControlProps";
import { getForegroundLocation } from "../utils/location";
import { isSameVisitLocalDay, visitDisplayIso } from "../utils/format";
import { extractPhotoUrl, photoCacheVersion } from "../utils/profilePhotoUrl";
import { getHomeVisits, invalidateHomeVisitsCache } from "../utils/visitsCache";

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);
  const initialLoadDone = useRef(false);
  const { colors, type } = useDesignSystem();
  const { date } = useLiveClock();
  const { employee } = useEmployee();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [weatherLat, setWeatherLat] = useState<string | number | null>(null);
  const [weatherLng, setWeatherLng] = useState<string | number | null>(null);
  const { status: gpsComplianceStatus } = useGpsCompliance();
  const { pendingCount } = useOfflineSync();
  const { refreshMasterData } = useMasterData();
  const {
    isActive,
    currentLocation,
    pendingSyncCount,
    refreshTracking
  } = useTracking();
  const { visitsVersion, employeePhotoVersion } = useFieldDataRefresh();
  const tabInset = useTabBarBottomInset();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const refreshControlProps = useRefreshControlProps();
  const { weather, loading: weatherLoading, refresh: refreshWeather, iconName: weatherIcon } = useFieldWeather(
    weatherLat,
    weatherLng
  );

  const gpsActive = gpsComplianceStatus === "active";

  const loadDashboard = useCallback(async (isRefresh = false, force = false) => {
    try {
      setError("");
      const visitCache = await getHomeVisits({ force: isRefresh || force, pageSize: 50 });
      setVisits(visitCache.visits);
      await refreshWeather().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
      setRefreshing(false);
      initialLoadDone.current = true;
    }
  }, [refreshWeather]);

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    if (visitsVersion > 0) {
      invalidateHomeVisitsCache();
      void loadDashboard(true, true);
    }
  }, [loadDashboard, visitsVersion]);

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
    invalidateHomeVisitsCache();
    await loadDashboard(true, true);
    await refreshTracking().catch(() => undefined);
  }

  const today = useMemo(() => new Date(), []);
  const todayVisits = useMemo(() => visits.filter((v) => isSameVisitLocalDay(v, today)), [visits, today]);
  const uniqueFarmersToday = useMemo(() => new Set(todayVisits.map((v) => v.farmer_name || v.farmer)).size, [todayVisits]);
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
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: safeTop }}>
        <DashboardSkeleton />
      </View>
    );
  }

  if (error && !employee && visits.length === 0) {
    return <ErrorState message={error} onRetry={() => loadDashboard(false, true)} />;
  }

  const displayName = employee?.full_name || employee?.name || employee?.username || "Field teammate";
  const rootNav = navigation.getParent();

  const weatherLine = weatherLoading
    ? "Loading weather…"
    : weather
      ? `${weather.tempC}° · ${weather.label}`
      : "Weather unavailable";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: safeTop }}>
      <OfflineExperienceBanner onPressSync={() => rootNav?.navigate("OfflineSync")} />
      <MasterDataOfflineBanner onPressSync={() => void refreshMasterData({ force: true })} />
      <ScrollView
        ref={scrollRef}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
        contentContainerStyle={[styles.screen, { paddingBottom: tabInset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <ProfileAvatar
              name={displayName}
              photoUrl={extractPhotoUrl(employee)}
              photoVersion={photoCacheVersion(employee, employeePhotoVersion)}
              size="lg"
            />
            <View style={styles.heroCopy}>
              <Text style={type.caption}>{date}</Text>
              <Text style={type.pageTitle}>
                {greetingForNow()}, {displayName.split(" ")[0]}
              </Text>
              <View style={styles.weatherRow}>
                <Ionicons name={weatherIcon} size={14} color={colors.primary} />
                <Text style={type.meta}>{weatherLine}</Text>
              </View>
            </View>
            <SyncStatusBadge onPress={() => rootNav?.navigate("OfflineSync")} />
          </View>
        </View>

        <FadeInView delay={10}>
          <PremiumStatusCard
            workdayActive={isActive}
            gpsActive={gpsActive}
            visitPending={pendingCount}
            routePending={pendingSyncCount}
            onSyncPress={() => rootNav?.navigate("OfflineSync")}
          />
        </FadeInView>

        <FadeInView delay={30}>
          <View style={styles.kpiSection}>
            <Text style={[type.sectionTitle, styles.sectionTitle]}>Today&apos;s field metrics</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCell}>
                <KpiCard icon="people-outline" label="Farmers visited" value={uniqueFarmersToday} accent={uniqueFarmersToday > 0} />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="time-outline"
                  label="Pending visits"
                  value={pendingCount}
                  hint={pendingCount ? "Tap to sync" : "All synced"}
                  accent={pendingCount > 0}
                  onPress={() => rootNav?.navigate("OfflineSync")}
                />
              </View>
            </View>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="trail-sign-outline"
                  label="Route points"
                  value={pendingSyncCount}
                  hint="Logged today"
                  onPress={() => navigation.navigate("Profile", { screen: "TrackingWorkspace" })}
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="folder-open-outline"
                  label="Open items"
                  value={pendingCount + pendingSyncCount}
                  hint="Visits + route queue"
                  onPress={() => rootNav?.navigate("OfflineSync")}
                />
              </View>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={50}>
          <PremiumQuickActions
            actions={[
              {
                icon: "add-circle",
                label: "New visit",
                primary: true,
                onPress: () => rootNav?.navigate("VisitFlow", { screen: "NewVisitFarmer", params: { fresh: true } })
              },
              {
                icon: "search-outline",
                label: "Search farmer",
                onPress: () => navigation.navigate("Farmers", { screen: "FarmersList" })
              },
              {
                icon: "map-outline",
                label: "Route history",
                onPress: () => rootNav?.navigate("TravelHistory")
              }
            ]}
          />
        </FadeInView>

        {recentVisits.length > 0 ? (
          <FadeInView delay={70}>
            <View style={styles.sectionHead}>
              <Text style={type.sectionTitle}>Recent activity</Text>
              <Pressable onPress={() => navigation.navigate("Visits", { screen: "VisitsList" })}>
                <Text style={[type.caption, { color: colors.primary }]}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.recentVisits}>
              {recentVisits.map((v) => (
                <VisitCard
                  key={v.id}
                  visit={v}
                  compact
                  onPress={() =>
                    navigation.navigate("Visits", {
                      screen: "VisitDetail",
                      params: { id: v.id }
                    })
                  }
                />
              ))}
            </View>
          </FadeInView>
        ) : null}

        <FadeInView delay={90}>
          <Pressable
            onPress={() => navigation.navigate("Profile", { screen: "TrackingWorkspace" })}
            style={({ pressed }) => [
              styles.trackingTeaser,
              { backgroundColor: colors.card, borderColor: colors.borderSubtle },
              pressed && { opacity: 0.94 }
            ]}
          >
            <View style={[styles.trackingIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="navigate" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle}>Live tracking</Text>
              <Text style={type.caption}>
                {isActive ? "Workday active — view map & route" : "Start workday from Profile → GPS tracking"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 16, paddingTop: 4 },
  hero: { paddingHorizontal: 16 },
  heroRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  heroCopy: { flex: 1, gap: 2, minWidth: 0 },
  weatherRow: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 4 },
  kpiSection: { gap: 10, paddingHorizontal: 16 },
  sectionTitle: { marginBottom: 2 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiCell: { flex: 1 },
  sectionHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  recentVisits: { gap: 10, paddingHorizontal: 16 },
  trackingTeaser: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    padding: 14
  },
  trackingIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44
  }
});
