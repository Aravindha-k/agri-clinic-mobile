import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated as RNAnimated
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandLogo } from "../../../src/components/brand/BrandLogo";
import { BRAND, LOGO_IMAGE } from "../../../src/config/brand";
import { useLanOnlyMode } from "../../../src/hooks/useLanOnlyMode";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useWorkdayTimer } from "../../../src/hooks/useLiveClock";
import { useCountUp } from "../../../src/hooks/useCountUp";
import { GlassCard, ScreenBackground } from "../../../src/components/glass";
import { ENT, ENT_SECTION_LABEL } from "../../../src/theme/enterprise";
import { LogoRefreshIndicator } from "../../../src/components/ui/LogoRefreshIndicator";
import { PressableScale } from "../../../src/components/ui/PressableScale";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import { formatRelativeTime } from "../../../src/utils/formatRelativeTime";
import { resolveWorkdayStartedAt } from "../../../src/utils/workdayStartedAt";
import { updateCachedWorkdayMetrics } from "../../../src/storage/workdaySessionStorage";
import { Avatar, OfflineBanner } from "../../components/ui";
import { KavyaLoader } from "../../components/KavyaLoader";
import { FONTS } from "../../../src/theme/fonts";
import { readDashboardCache } from "../../lib/dashboardCache";
import { fetchDashboard, fetchWorkStatus } from "../../lib/homeApi";
import { getBadgeCount } from "../../lib/notificationsApi";
import { useSyncStore } from "../../lib/store/syncStore";
import { formatDistanceKm, formatShortTime } from "../../lib/format";
import type { DashboardData, DashboardRecentVisit, MobileWorkStatus } from "../../lib/types";

const STAT_ICONS = [
  { icon: "navigate-outline" as const, color: ENT.info, bg: ENT.infoSoft },
  { icon: "time-outline" as const, color: ENT.warning, bg: ENT.warningSoft },
  { icon: "clipboard-outline" as const, color: ENT.primary, bg: ENT.primarySoft },
  { icon: "people-outline" as const, color: "#64748B", bg: "#F1F5F9" }
];

function PulsingDot({ active }: { active: boolean }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      opacity.value = 0.45;
      return;
    }
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 750 }), withTiming(1, { duration: 750 })),
      -1,
      false
    );
  }, [active, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.pulseDot, { backgroundColor: active ? ENT.primary : ENT.textMuted }, style]}
    />
  );
}

/** Part 1 — PLACEMENT 1: logo image + clinic name + version */
function HeaderBrandCombo() {
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  return (
    <View style={styles.brandCombo}>
      {LOGO_IMAGE ? (
        <Image source={LOGO_IMAGE} style={styles.brandLogo} resizeMode="contain" />
      ) : (
        <BrandLogo variant="header" width={32} height={32} />
      )}
      <View style={styles.brandCopy}>
        <Text style={styles.brandAppName} numberOfLines={1}>
          {BRAND.splashTitle}
        </Text>
        <Text style={styles.brandVersion}>v{appVersion}</Text>
      </View>
    </View>
  );
}

function NotificationBell({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.88 }]}
    >
      <Ionicons name="notifications-outline" size={18} color={ENT.textSecondary} />
      {count > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Part 1 — PLACEMENT 4: watermark on timer card */
function LogoWatermark({ size = 36, opacity = 0.12 }: { size?: number; opacity?: number }) {
  if (!LOGO_IMAGE) return null;
  return (
    <Image
      source={LOGO_IMAGE}
      style={{ width: size, height: size, opacity, borderRadius: 8 }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

function WorkdayTimerCard({
  active,
  startedAt,
  distanceKm,
  busy,
  timerDisplay,
  syncLabel,
  onStart,
  t
}: {
  active: boolean;
  startedAt: string | null;
  distanceKm: number;
  busy: boolean;
  timerDisplay: string;
  syncLabel?: string | null;
  onStart: () => void;
  t: (key: string) => string;
}) {
  if (!active) {
    return (
      <GlassCard style={styles.idleCardOuter}>
        <View style={styles.idleHeaderRow}>
          <View style={styles.idleIconWrap}>
            <Ionicons name="time-outline" size={20} color={ENT.primary} />
          </View>
          <View style={styles.idleCopy}>
            <Text style={styles.idleTitle}>{t("home.startWorkday")}</Text>
            <Text style={styles.idleSub}>{t("home.startWorkdayBody")}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onStart}
          style={({ pressed }) => [styles.idleCta, pressed && { opacity: 0.92 }, busy && { opacity: 0.6 }]}
        >
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={styles.idleCtaText}>{t("home.startWorkday")}</Text>
        </Pressable>
      </GlassCard>
    );
  }

  const todayLabel = dayjs().format("dddd, D MMM");

  return (
    <GlassCard style={styles.timerCardOuter}>
      <View style={styles.timerCard}>
        <View style={styles.timerAccent} />
        <View style={styles.timerStatusRow}>
          <PulsingDot active />
          <Text style={styles.timerLabel}>ACTIVE WORKDAY</Text>
          {syncLabel ? <Text style={styles.timerSyncBadge}>{syncLabel}</Text> : null}
        </View>
        <Text style={styles.timerValue} accessibilityLabel={`Workday timer ${timerDisplay}`}>
          {timerDisplay}
        </Text>
        <Text style={styles.timerSub}>
          {startedAt
            ? `Started ${formatShortTime(startedAt)} · ${formatDistanceKm(distanceKm)} km covered`
            : `${formatDistanceKm(distanceKm)} km covered today`}
        </Text>
        <Text style={styles.timerDate}>{todayLabel}</Text>
      </View>
    </GlassCard>
  );
}

function StatCard({
  value,
  label,
  index
}: {
  value: string | number;
  label: string;
  index: number;
}) {
  const meta = STAT_ICONS[index] ?? STAT_ICONS[0];
  return (
    <GlassCard style={styles.statCardGlow}>
      <View style={styles.statCard}>
        <View style={[styles.statIconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={14} color={meta.color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </GlassCard>
  );
}

type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function QuickActionCard({ action, index }: { action: QuickAction; index: number }) {
  const translateY = useRef(new RNAnimated.Value(30)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(translateY, { toValue: 0, speed: 14, bounciness: 8, delay: 500 + index * 80, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 1, duration: 300, delay: 500 + index * 80, useNativeDriver: true })
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <RNAnimated.View style={{ opacity, transform: [{ translateY }] }}>
      <GlassCard style={styles.actionCardGlow}>
        <PressableScale onPress={action.onPress} accessibilityRole="button" style={styles.actionCard}>
          <View style={styles.actionIconWrap}>
            <Ionicons name={action.icon} size={18} color={ENT.textSecondary} />
          </View>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </PressableScale>
      </GlassCard>
    </RNAnimated.View>
  );
}

function RecentRow({ item, index }: { item: DashboardRecentVisit; index: number }) {
  const translateX = useRef(new RNAnimated.Value(60)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(translateX, { toValue: 0, speed: 14, bounciness: 6, delay: index * 120, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 1, duration: 300, delay: index * 120, useNativeDriver: true })
    ]).start();
  }, [index, opacity, translateX]);

  return (
    <RNAnimated.View style={[styles.recentRowWrap, { opacity, transform: [{ translateX }] }]}>
      <GlassCard>
        <View style={styles.recentRow}>
          <Avatar name={item.farmer_name} size="sm" />
          <View style={styles.recentCopy}>
            <Text style={styles.recentName} numberOfLines={1}>
              {item.farmer_name}
            </Text>
            {item.crop ? (
              <View style={styles.recentCropBadge}>
                <Text style={styles.recentCropText}>{item.crop}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.recentTime}>{formatRelativeTime(item.visited_at)}</Text>
        </View>
      </GlassCard>
    </RNAnimated.View>
  );
}

/** Part 1 — PLACEMENT 3: empty state watermark */
function RecentEmptyState({ message }: { message: string }) {
  return (
    <GlassCard style={styles.recentEmptyGlow}>
      <View style={styles.recentEmpty}>
        <LogoWatermark size={48} opacity={0.08} />
        <Text style={styles.recentEmptyText}>{message}</Text>
      </View>
    </GlassCard>
  );
}

export default function HomeTabScreen() {
  useSecureScreen();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const { pendingCount, syncAll, lastSyncAt } = useOfflineSync();
  const { visitsVersion } = useFieldDataRefresh();
  const { isActive, startedAt: trackingStartedAt, startDay, busy, refreshTracking, workday, workdaySyncStatus, cachedDistanceKm } = useTracking();
  const unreadNotifCount = useSyncStore((state) => state.unreadNotifCount);
  const lanOnly = useLanOnlyMode();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [workStatus, setWorkStatus] = useState<MobileWorkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const rootNav = navigation.getParent();
  const workActive = isActive || Boolean(workStatus?.is_active);
  const startedAt = useMemo(() => {
    return (
      resolveWorkdayStartedAt(workday) ||
      trackingStartedAt ||
      resolveWorkdayStartedAt(workStatus) ||
      null
    );
  }, [trackingStartedAt, workStatus, workday]);
  const workdayTimer = useWorkdayTimer(startedAt, workActive);
  const distanceKm = workStatus?.distance_km ?? cachedDistanceKm ?? 0;
  const visitsCount = useCountUp(dashboard?.visits_today ?? 0, 1200, 400);
  const farmersCount = useCountUp(dashboard?.farmers_covered ?? 0, 1000, 500);
  const distanceCount = useCountUp(Math.round(distanceKm * 10), 1400, 300) / 10;

  const timerCardScale = useRef(new RNAnimated.Value(0.85)).current;
  const timerCardOpacity = useRef(new RNAnimated.Value(0)).current;
  const statAnims = useRef(
    [0, 1, 2, 3].map(() => ({
      y: new RNAnimated.Value(20),
      opacity: new RNAnimated.Value(0)
    }))
  ).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(timerCardScale, { toValue: 1, speed: 12, bounciness: 8, delay: 200, useNativeDriver: true }),
      RNAnimated.timing(timerCardOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true })
    ]).start();

    RNAnimated.stagger(
      80,
      statAnims.map((a) =>
        RNAnimated.parallel([
          RNAnimated.spring(a.y, { toValue: 0, speed: 15, bounciness: 8, useNativeDriver: true }),
          RNAnimated.timing(a.opacity, { toValue: 1, duration: 300, useNativeDriver: true })
        ])
      )
    ).start();
  }, [statAnims, timerCardOpacity, timerCardScale]);
  const syncLabel =
    workActive && (workdaySyncStatus === "syncing" || workdaySyncStatus === "cached")
      ? t("common.syncing")
      : workActive && workdaySyncStatus === "connecting"
        ? t("home.connectingToServer")
        : null;
  const headerDate = dayjs().format("dddd, D MMM");

  const applyWorkStatus = useCallback((work: MobileWorkStatus) => {
    setWorkStatus(work);
    if (work.is_active) {
      void updateCachedWorkdayMetrics(work.distance_km ?? 0, work.route_points ?? 0);
    }
  }, []);

  const loadAll = useCallback(async (isRefresh = false) => {
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
  }, [applyWorkStatus]);

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
    Alert.alert(t("home.startWorkdayConfirm"), t("home.startWorkdayBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.start"),
        onPress: () => {
          void (async () => {
            await startDay();
            await refreshTracking().catch(() => undefined);
            void fetchWorkStatus().then(applyWorkStatus).catch(() => undefined);
          })();
        }
      }
    ]);
  }

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        key: "farmers",
        label: t("home.farmers"),
        icon: "people-outline",
        onPress: () => navigation.navigate("Farmers", { screen: "FarmersList" })
      },
      {
        key: "visits",
        label: t("home.myVisits"),
        icon: "clipboard-outline",
        onPress: () => navigation.navigate("Visits", { screen: "VisitsList" })
      },
      {
        key: "problems",
        label: t("home.problems"),
        icon: "warning-outline",
        onPress: () => navigation.navigate("Profile", { screen: "ProblemsCatalog" })
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

  const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : null;

  if (loading && !dashboard && !workActive) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <KavyaLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenBackground />
      <LogoRefreshIndicator refreshing={refreshing} />
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabInset }]}
      >
        {pendingCount > 0 || lanOnly ? (
          <OfflineBanner
            pendingCount={pendingCount}
            lastSyncedAt={lastSyncDate}
            onSync={() => void syncAll()}
            lanOnly={lanOnly}
            offline={lanOnly}
          />
        ) : null}

        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <HeaderBrandCombo />
            <NotificationBell
              count={unreadNotifCount}
              onPress={() => rootNav?.navigate("Notifications")}
            />
          </View>

          <View style={styles.statusChip}>
            {workActive ? <PulsingDot active={workActive} /> : <PulsingDot active={false} />}
            <Text style={styles.statusChipText}>
              {workActive ? `WORKING · GPS ACTIVE · ${headerDate}` : `OFF DUTY · ${headerDate}`}
            </Text>
          </View>
        </View>

        <RNAnimated.View style={{ opacity: timerCardOpacity, transform: [{ scale: timerCardScale }] }}>
          <WorkdayTimerCard
            active={workActive}
            startedAt={startedAt}
            distanceKm={distanceKm}
            busy={busy}
            timerDisplay={workdayTimer.display}
            syncLabel={syncLabel}
            onStart={confirmStartWorkday}
            t={t}
          />
        </RNAnimated.View>

        <View style={styles.statsGrid}>
          {[
            { value: formatDistanceKm(distanceCount), label: t("home.distanceToday") },
            { value: workActive ? workdayTimer.compact : "0h 0m", label: t("home.hoursWorked") },
            { value: visitsCount, label: t("home.visitsToday") },
            { value: farmersCount, label: t("home.farmersCovered") }
          ].map((stat, index) => (
            <RNAnimated.View
              key={stat.label}
              style={{ opacity: statAnims[index].opacity, transform: [{ translateY: statAnims[index].y }], flexBasis: "47%", flexGrow: 1 }}
            >
              <StatCard value={stat.value} label={stat.label} index={index} />
            </RNAnimated.View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, ENT_SECTION_LABEL]}>{t("home.quickActions").toUpperCase()}</Text>
          <View style={styles.actionGrid}>
            {quickActions.map((action, index) => (
              <QuickActionCard key={action.key} action={action} index={index} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, ENT_SECTION_LABEL]}>{t("home.recent").toUpperCase()}</Text>
          {(dashboard?.recent_visits.length ?? 0) > 0 ? (
            <View style={styles.recentList}>
              {dashboard!.recent_visits.map((item, index) => (
                <RecentRow key={item.id} item={item} index={index} />
              ))}
            </View>
          ) : (dashboard?.visits_today ?? 0) > 0 ? (
            <RecentEmptyState message={t("home.pullToRefreshRecent")} />
          ) : (
            <RecentEmptyState message={t("home.noVisitsYet")} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: ENT.bg,
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  scroll: {
    flexGrow: 1,
    gap: 0
  },
  headerSection: {
    backgroundColor: ENT.card,
    borderBottomColor: ENT.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  brandCombo: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
    paddingRight: 12
  },
  brandLogo: {
    borderRadius: 10,
    height: 36,
    width: 36
  },
  brandCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0
  },
  brandAppName: {
    color: ENT.text,
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2
  },
  brandVersion: {
    color: ENT.textSecondary,
    fontFamily: FONTS.medium,
    fontSize: 10,
    fontWeight: "500"
  },
  bellBtn: {
    alignItems: "center",
    backgroundColor: ENT.bg,
    borderColor: ENT.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  bellBadge: {
    alignItems: "center",
    backgroundColor: ENT.danger,
    borderRadius: 7,
    height: 14,
    justifyContent: "center",
    minWidth: 14,
    paddingHorizontal: 3,
    position: "absolute",
    right: -2,
    top: -2
  },
  bellBadgeText: {
    color: ENT.white,
    fontSize: 8,
    fontWeight: "700"
  },
  statusChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: ENT.bg,
    borderColor: ENT.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  pulseDot: {
    borderRadius: 999,
    height: 6,
    width: 6
  },
  statusChipText: {
    color: ENT.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6
  },
  timerCardOuter: {
    marginHorizontal: 16,
    marginTop: 14
  },
  timerCard: {
    minHeight: 120,
    overflow: "hidden",
    padding: 16,
    position: "relative"
  },
  timerAccent: {
    backgroundColor: ENT.primary,
    borderRadius: 2,
    bottom: 12,
    left: 0,
    position: "absolute",
    top: 12,
    width: 4
  },
  timerStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingLeft: 8
  },
  timerSyncBadge: {
    backgroundColor: ENT.primarySoft,
    borderRadius: 999,
    color: ENT.primary,
    fontFamily: FONTS.medium,
    fontSize: 9,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  timerLabel: {
    color: ENT.primary,
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  timerValue: {
    color: ENT.text,
    fontFamily: FONTS.extrabold,
    fontSize: 36,
    letterSpacing: 1,
    lineHeight: 44,
    marginTop: 8,
    paddingLeft: 8,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {})
  },
  timerSub: {
    color: ENT.textSecondary,
    fontFamily: FONTS.medium,
    fontSize: 10,
    marginTop: 6,
    paddingLeft: 8
  },
  timerDate: {
    color: ENT.textMuted,
    fontFamily: FONTS.medium,
    fontSize: 9.5,
    marginTop: 8,
    paddingLeft: 8
  },
  idleCardOuter: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16
  },
  idleHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 14
  },
  idleIconWrap: {
    alignItems: "center",
    backgroundColor: ENT.primarySoft,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  idleCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  idleTitle: {
    color: ENT.text,
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: "700"
  },
  idleSub: {
    color: ENT.textSecondary,
    fontFamily: FONTS.medium,
    fontSize: 12
  },
  idleCta: {
    alignItems: "center",
    backgroundColor: ENT.primary,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    height: 44,
    justifyContent: "center"
  },
  idleCtaText: {
    color: ENT.white,
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: "700"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12
  },
  statCardGlow: {
    flex: 1
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 6,
    padding: 12
  },
  statIconWrap: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  statValue: {
    color: ENT.text,
    fontSize: 22,
    fontWeight: "800"
  },
  statLabel: {
    color: ENT.textSecondary,
    fontSize: 9.5,
    fontWeight: "500"
  },
  section: {
    marginHorizontal: 16,
    marginTop: 14
  },
  sectionLabel: {
    marginBottom: 8
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  actionCardGlow: {
    flex: 1
  },
  actionCard: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 14
  },
  actionIconWrap: {
    alignItems: "center",
    backgroundColor: ENT.bg,
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  actionLabel: {
    color: ENT.text,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8
  },
  recentList: {
    gap: 8
  },
  recentRowWrap: {
    marginBottom: 0
  },
  recentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  recentCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  recentName: {
    color: ENT.text,
    fontSize: 14,
    fontWeight: "700"
  },
  recentCropBadge: {
    alignSelf: "flex-start",
    backgroundColor: ENT.bg,
    borderColor: ENT.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2
  },
  recentCropText: {
    color: ENT.textSecondary,
    fontSize: 10,
    fontWeight: "600"
  },
  recentTime: {
    color: ENT.textMuted,
    fontSize: 11
  },
  recentEmptyGlow: {
    alignSelf: "stretch"
  },
  recentEmpty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28
  },
  recentEmptyText: {
    color: ENT.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center"
  },
  recentSkeletonWrap: {
    gap: 8
  }
});
