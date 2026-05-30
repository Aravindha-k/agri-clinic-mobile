import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Visit } from "../api/visits";
import { getVisits } from "../api/visits";
import { GpsFieldStatusChip } from "../components/GpsFieldStatusChip";
import { HomeHeroCard } from "../components/home/HomeHeroCard";
import { WorkdayStatusCard } from "../components/home/WorkdayStatusCard";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useFieldWeather } from "../hooks/useFieldWeather";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { ErrorState } from "../components/ErrorState";
import { FadeInView } from "../components/FadeInView";
import { PremiumCard, StatWidget, SyncStatusBadge, VisitCard } from "../components/ui";
import { useEmployee } from "../storage/EmployeeContext";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { useTracking } from "../storage/TrackingContext";
import { useTheme } from "../theme";
import { listCardType } from "../theme/listCard";
import { space } from "../theme/layout";
import { useRefreshControlProps } from "../hooks/useRefreshControlProps";
import { getForegroundLocation } from "../utils/location";
import { asArray, isSameVisitLocalDay, visitDisplayIso } from "../utils/format";
import { normalizeVisitFromApi } from "../utils/visitFarmer";
import { extractPhotoUrl, photoCacheVersion } from "../utils/profilePhotoUrl";

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const QUICK_ACTIONS = [
  { icon: "clipboard-outline" as const, label: "Visits", route: "Visits" as const, screen: "VisitsList" as const },
  { icon: "people-outline" as const, label: "Farmers", route: "Farmers" as const, screen: "FarmersList" as const },
  { icon: "navigate" as const, label: "Live map", route: "LiveMap" as const },
  { icon: "trail-sign-outline" as const, label: "Travel", route: "TravelHistory" as const }
];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);
  const { theme } = useTheme();
  const c = theme.colors;
  const { employee, refreshEmployee } = useEmployee();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [weatherLat, setWeatherLat] = useState<string | number | null>(null);
  const [weatherLng, setWeatherLng] = useState<string | number | null>(null);
  const {
    busy: trackingBusy,
    isActive,
    startedAt,
    lastSyncTime,
    nextSyncAt,
    currentLocation,
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

  const load = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      const [, visitData] = await Promise.all([refreshEmployee(), getVisits()]);
      setVisits(asArray<Visit>(visitData).map(normalizeVisitFromApi));
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
    } catch (err) {
      Alert.alert("Unable to start work", err instanceof Error ? err.message : "Please try again.");
    }
  }

  const today = useMemo(() => new Date(), []);
  const todayVisits = useMemo(() => visits.filter((v) => isSameVisitLocalDay(v, today)), [visits, today]);
  const recentVisitCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return visits.filter((v) => {
      const iso = visitDisplayIso(v);
      return iso && new Date(iso).getTime() >= cutoff;
    }).length;
  }, [visits]);
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
    if (item.route === "LiveMap" || item.route === "TravelHistory") {
      rootNav?.navigate(item.route);
      return;
    }
    navigation.navigate(item.route, { screen: item.screen });
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scrollRef}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
        contentContainerStyle={[styles.screen, { paddingBottom: tabInset }]}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: c.background }}
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
          <GpsFieldStatusChip />
          <FadeInView delay={40}>
            <WorkdayStatusCard
              isActive={isActive}
              startedAt={startedAt}
              lastSyncTime={lastSyncTime}
              nextSyncAt={nextSyncAt}
              busy={trackingBusy}
              onStart={handleStartDay}
              onLiveMap={() => rootNav?.navigate("LiveMap")}
            />
          </FadeInView>

          <FadeInView delay={80}>
            <View style={styles.metricsRow}>
              <StatWidget label="Visits today" value={todayVisits.length} />
              <StatWidget label="This week" value={recentVisitCount} />
            </View>
          </FadeInView>

          {recentVisits.length > 0 ? (
            <FadeInView delay={110}>
              <View style={styles.sectionHead}>
              <Text style={[listCardType.title, { color: c.text }]}>Recent visits</Text>
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

          <FadeInView delay={140}>
            <Text style={[listCardType.title, { color: c.text }]}>Quick access</Text>
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
  screen: {
    flexGrow: 1
  },
  body: {
    gap: space.md + 2,
    paddingHorizontal: space.lg,
    paddingTop: space.md
  },
  sectionHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: space.xs
  },
  recentVisits: {
    gap: 10,
    marginTop: 8
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8
  },
  quickTile: {
    width: "48%"
  },
  quickTilePressed: {
    opacity: 0.92
  },
  quickTileInner: {
    alignItems: "center",
    gap: 8,
    minHeight: 84,
    paddingVertical: 12
  },
  quickIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44
  }
});
