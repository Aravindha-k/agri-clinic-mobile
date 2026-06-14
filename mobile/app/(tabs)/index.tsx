import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
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
import { useI18n } from "../../../src/i18n/I18nContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import { formatRelativeTime } from "../../../src/utils/formatRelativeTime";
import { Avatar, OfflineBanner, PrimaryButton, StatusChip } from "../../components/ui";
import { KavyaLoader } from "../../components/KavyaLoader";
import { FONTS } from "../../../src/theme/fonts";
import { readDashboardCache } from "../../lib/dashboardCache";
import { fetchDashboard, fetchWorkStatus } from "../../lib/homeApi";
import { getBadgeCount } from "../../lib/notificationsApi";
import { useSyncStore } from "../../lib/store/syncStore";
import { formatDistanceKm, formatShortTime } from "../../lib/format";
import type { DashboardData, DashboardRecentVisit, MobileWorkStatus } from "../../lib/types";

const DS = {
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#f1f5f9",
  textPrimary: "#0f172a",
  textMuted: "#94a3b8",
  textSubtle: "#64748b",
  accent: "#16a34a",
  accentBg: "#f0fdf4",
  live: "#22c55e",
  bellBg: "#f1f5f9"
} as const;

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
      style={[styles.pulseDot, { backgroundColor: active ? DS.live : DS.textMuted }, style]}
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

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function NotificationBell({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.88 }]}
    >
      <Ionicons name="notifications-outline" size={18} color={DS.textSubtle} />
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
  nowMs,
  onStart,
  t
}: {
  active: boolean;
  startedAt: string | null;
  distanceKm: number;
  busy: boolean;
  nowMs: number;
  onStart: () => void;
  t: (key: string) => string;
}) {
  if (!active) {
    return (
      <View style={styles.idleCard}>
        <View style={styles.idleIconWrap}>
          <Ionicons name="time-outline" size={20} color={DS.accent} />
        </View>
        <Text style={styles.idleTitle}>{t("home.startWorkday")}</Text>
        <Text style={styles.idleSub}>{t("home.startWorkdayBody")}</Text>
        <PrimaryButton
          label={t("home.startWorkday")}
          onPress={onStart}
          loading={busy}
          icon={<Ionicons name="play" size={18} color="#fff" />}
        />
      </View>
    );
  }

  const startMs = startedAt ? new Date(startedAt).getTime() : NaN;
  const elapsedSeconds =
    startedAt && !Number.isNaN(startMs) ? Math.max(0, Math.floor((nowMs - startMs) / 1000)) : 0;
  const todayLabel = dayjs().format("dddd, D MMM");

  return (
    <View style={styles.timerCard}>
      <View style={styles.timerWatermark}>
        <LogoWatermark size={36} opacity={0.12} />
      </View>
      <View style={styles.timerDecorCircle} />

      <View style={styles.timerStatusRow}>
        <PulsingDot active />
        <Text style={styles.timerLabel}>ACTIVE WORKDAY</Text>
      </View>

      <Text style={styles.timerValue}>{formatTime(elapsedSeconds)}</Text>

      <Text style={styles.timerSub}>
        Started {formatShortTime(startedAt)} · {formatDistanceKm(distanceKm)} km covered
      </Text>

      <Text style={styles.timerDate}>{todayLabel}</Text>
    </View>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.actionIconWrap}>
        <Ionicons name={action.icon} size={18} color={DS.accent} />
      </View>
      <Text style={styles.actionLabel}>{action.label}</Text>
    </Pressable>
  );
}

function RecentRow({ item }: { item: DashboardRecentVisit }) {
  return (
    <View style={styles.recentRow}>
      <Avatar name={item.farmer_name} size="sm" />
      <View style={styles.recentCopy}>
        <Text style={styles.recentName} numberOfLines={1}>
          {item.farmer_name}
        </Text>
        {item.crop ? <StatusChip label={item.crop} variant="gray" /> : null}
      </View>
      <Text style={styles.recentTime}>{formatRelativeTime(item.visited_at)}</Text>
    </View>
  );
}

/** Part 1 — PLACEMENT 3: empty state watermark */
function RecentEmptyState({ message }: { message: string }) {
  return (
    <View style={styles.recentEmpty}>
      <LogoWatermark size={48} opacity={0.1} />
      <Text style={styles.recentEmptyText}>{message}</Text>
    </View>
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
  const { isActive, startedAt: trackingStartedAt, startDay, busy, refreshTracking } = useTracking();
  const unreadNotifCount = useSyncStore((state) => state.unreadNotifCount);
  const lanOnly = useLanOnlyMode();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [workStatus, setWorkStatus] = useState<MobileWorkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const rootNav = navigation.getParent();
  const workActive = isActive || Boolean(workStatus?.is_active);
  const startedAt =
    (isActive && trackingStartedAt) || workStatus?.started_at || trackingStartedAt || null;
  const distanceKm = workStatus?.distance_km ?? 0;
  const routePoints = workStatus?.route_points ?? 0;
  const headerDate = dayjs().format("dddd, D MMM");

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [dash, work] = await Promise.all([fetchDashboard({ force: isRefresh }), fetchWorkStatus()]);
      setDashboard(dash);
      setWorkStatus(work);
      void getBadgeCount(true);
    } catch {
      const cachedDash = await readDashboardCache();
      if (cachedDash) setDashboard(cachedDash);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      void refreshTracking().catch(() => undefined);
      void fetchWorkStatus().then(setWorkStatus).catch(() => undefined);
      void getBadgeCount(true);
      void fetchDashboard({ force: true }).then(setDashboard).catch(() => undefined);
    }, [refreshTracking])
  );

  useEffect(() => {
    if (visitsVersion > 0) {
      void fetchDashboard({ force: true }).then(setDashboard).catch(() => undefined);
    }
  }, [visitsVersion]);

  useEffect(() => {
    if (!workActive) return;
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [workActive]);

  useEffect(() => {
    if (!workActive) return;
    const poll = setInterval(() => {
      void fetchDashboard({ force: true }).then(setDashboard).catch(() => undefined);
    }, 60_000);
    return () => clearInterval(poll);
  }, [workActive]);

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
            void fetchWorkStatus().then(setWorkStatus).catch(() => undefined);
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

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <KavyaLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
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
            <PulsingDot active={workActive} />
            <Text style={styles.statusChipText}>
              {workActive ? "WORKING · GPS ACTIVE" : "OFF DUTY"}
            </Text>
          </View>
          <Text style={styles.headerDate}>{headerDate}</Text>
        </View>

        <WorkdayTimerCard
          active={workActive}
          startedAt={startedAt}
          distanceKm={distanceKm}
          busy={busy}
          nowMs={nowMs}
          onStart={confirmStartWorkday}
          t={t}
        />

        <View style={styles.statsGrid}>
          <StatCard value={formatDistanceKm(distanceKm)} label={t("home.distanceToday")} />
          <StatCard value={routePoints} label={t("home.routePoints")} />
          <StatCard value={dashboard?.visits_today ?? 0} label={t("home.visitsToday")} />
          <StatCard value={dashboard?.farmers_covered ?? 0} label={t("home.farmersCovered")} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("home.quickActions").toUpperCase()}</Text>
          <View style={styles.actionGrid}>
            {quickActions.map((action) => (
              <QuickActionCard key={action.key} action={action} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("home.recent").toUpperCase()}</Text>
          {(dashboard?.recent_visits.length ?? 0) > 0 ? (
            <View style={styles.recentList}>
              {dashboard!.recent_visits.map((item) => (
                <RecentRow key={item.id} item={item} />
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
    backgroundColor: DS.bg,
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
    backgroundColor: DS.surface,
    borderBottomColor: DS.border,
    borderBottomWidth: 1,
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
    borderRadius: 8,
    height: 32,
    width: 32
  },
  brandCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0
  },
  brandAppName: {
    color: DS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2
  },
  brandVersion: {
    color: DS.textMuted,
    fontFamily: FONTS.medium,
    fontSize: 10,
    fontWeight: "500"
  },
  bellBtn: {
    alignItems: "center",
    backgroundColor: DS.bellBg,
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  bellBadge: {
    alignItems: "center",
    backgroundColor: "#ef4444",
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
    color: "#fff",
    fontSize: 8,
    fontWeight: "700"
  },
  statusChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: DS.accentBg,
    borderRadius: 999,
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
    color: DS.accent,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6
  },
  headerDate: {
    color: DS.textMuted,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4
  },
  timerCard: {
    backgroundColor: DS.accent,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    minHeight: 140,
    overflow: "hidden",
    padding: 16,
    position: "relative"
  },
  timerWatermark: {
    position: "absolute",
    right: 12,
    top: 10,
    zIndex: 1
  },
  timerDecorCircle: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    height: 120,
    position: "absolute",
    right: -30,
    top: -30,
    width: 120
  },
  timerStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    zIndex: 2
  },
  timerLabel: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: FONTS.bold,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  timerValue: {
    color: "#fff",
    fontFamily: FONTS.extrabold,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 8,
    zIndex: 2
  },
  timerSub: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: FONTS.medium,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 6,
    zIndex: 2
  },
  timerDate: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: FONTS.medium,
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 8,
    zIndex: 2
  },
  idleCard: {
    backgroundColor: DS.surface,
    borderColor: DS.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16
  },
  idleIconWrap: {
    alignItems: "center",
    backgroundColor: DS.accentBg,
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  idleTitle: {
    color: DS.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  idleSub: {
    color: DS.textMuted,
    fontSize: 13,
    marginBottom: 4
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12
  },
  statCard: {
    backgroundColor: DS.surface,
    borderColor: DS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 12
  },
  statValue: {
    color: DS.textPrimary,
    fontSize: 24,
    fontWeight: "800"
  },
  statLabel: {
    color: DS.textMuted,
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 3
  },
  section: {
    marginHorizontal: 16,
    marginTop: 14
  },
  sectionLabel: {
    color: DS.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  actionCard: {
    backgroundColor: DS.surface,
    borderColor: DS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 14
  },
  actionIconWrap: {
    alignItems: "center",
    backgroundColor: DS.accentBg,
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  actionLabel: {
    color: DS.textPrimary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8
  },
  recentList: {
    gap: 8
  },
  recentRow: {
    alignItems: "center",
    backgroundColor: DS.surface,
    borderColor: DS.border,
    borderRadius: 14,
    borderWidth: 1,
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
    color: DS.textPrimary,
    fontSize: 14,
    fontWeight: "600"
  },
  recentTime: {
    color: DS.textMuted,
    fontSize: 11
  },
  recentEmpty: {
    alignItems: "center",
    backgroundColor: DS.surface,
    borderColor: DS.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    paddingVertical: 28
  },
  recentEmptyText: {
    color: DS.textMuted,
    fontSize: 13,
    fontWeight: "500"
  },
  recentSkeletonWrap: {
    gap: 8
  }
});
