import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { getExpoBuildUrl, isExpoGo } from "../../src/utils/expoRuntime";
import { getAllWorkdayLocations } from "../../src/api/tracking";
import { useConnectivityOnline } from "../../src/hooks/useConnectivityOnline";
import { useRefreshControlProps } from "../../src/hooks/useRefreshControlProps";
import { useSafeAreaInsetsCompat } from "../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../src/hooks/useSecureScreen";
import { useTracking } from "../../src/storage/TrackingContext";
import { isSameVisitLocalDay } from "../../src/utils/format";
import { getHomeVisits } from "../../src/utils/visitsCache";
import { PrimaryButton, StatusChip } from "../components/ui";
import { NeonProgressBar } from "../../src/components/cinematic";
import { fetchWorkStatus } from "../lib/homeApi";
import {
  flushGpsBuffer,
  getBatteryPercent,
  getGpsBufferStatus,
  getLastBufferedPointTime,
  migrateLegacyGpsQueueIfNeeded
} from "../lib/gps/trackingService";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../lib/theme";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatLiveTimer(startedAt: string | null, now: number) {
  if (!startedAt) return "00:00:00";
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return "00:00:00";
  const elapsed = Math.max(0, now - started);
  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  const s = Math.floor((elapsed % 60_000) / 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function formatStartedTime(startedAt: string | null) {
  if (!startedAt) return "Not started";
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return "Not started";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function secondsAgo(iso: string | null) {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.max(0, Math.round((Date.now() - ts) / 1000));
}

function accuracyVariant(meters: number | null | undefined): "green" | "amber" | "red" {
  if (meters == null || !Number.isFinite(meters)) return "amber";
  if (meters <= 20) return "green";
  if (meters <= 50) return "amber";
  return "red";
}

function gpsHealthVariant(
  isActive: boolean,
  accuracy: number | null | undefined,
  lastSeconds: number | null
): { label: string; variant: "green" | "amber" | "red" | "gray" } {
  if (!isActive) return { label: "Off", variant: "gray" };
  if (lastSeconds != null && lastSeconds > 180) return { label: "Weak", variant: "amber" };
  if (accuracy != null && accuracy > 50) return { label: "Weak", variant: "amber" };
  return { label: "Active", variant: "green" };
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStatCell}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function TodayStatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.todayCard}>
      <Text style={styles.todayValue}>{value}</Text>
      <Text style={styles.todayLabel}>{label}</Text>
    </View>
  );
}

function ExpoGoGpsBanner({ onBuildApk }: { onBuildApk: () => void }) {
  return (
    <View style={styles.expoGoBanner}>
      <View style={styles.expoGoBannerHeader}>
        <Ionicons name="warning-outline" size={20} color={Colors.amberText} />
        <Text style={styles.expoGoBannerTitle}>Limited GPS in Expo Go</Text>
      </View>
      <Text style={styles.expoGoBannerBody}>
        Background location tracking requires the production APK. Your GPS points are recorded while the app is open,
        but will pause when backgrounded.
      </Text>
      <Pressable onPress={onBuildApk} style={({ pressed }) => [styles.expoGoBuildBtn, pressed && { opacity: 0.9 }]}>
        <Text style={styles.expoGoBuildBtnText}>Build APK</Text>
        <Ionicons name="open-outline" size={14} color={Colors.amberText} />
      </Pressable>
    </View>
  );
}

export default function TrackingWorkspaceScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const online = useConnectivityOnline();
  const refreshControlProps = useRefreshControlProps();
  const {
    isActive,
    startedAt,
    busy,
    startDay,
    currentLocation,
    lastSyncTime,
    pendingSyncCount,
    refreshTracking,
    gpsState
  } = useTracking();

  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [syncingGps, setSyncingGps] = useState(false);
  const [bufferStatus, setBufferStatus] = useState(getGpsBufferStatus());
  const [distanceKm, setDistanceKm] = useState(0);
  const [gpsPointsLogged, setGpsPointsLogged] = useState(0);
  const [visitsToday, setVisitsToday] = useState(0);
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);

  const liveTimer = useMemo(() => formatLiveTimer(startedAt, now), [startedAt, now]);
  const durationHours = useMemo(() => {
    if (!startedAt) return "0.0";
    const started = new Date(startedAt).getTime();
    if (Number.isNaN(started)) return "0.0";
    return (Math.max(0, now - started) / 3_600_000).toFixed(1);
  }, [now, startedAt]);

  const accuracy = currentLocation?.accuracy ?? null;
  const lastPointIso = lastSyncTime || getLastBufferedPointTime();
  const lastPointSeconds = secondsAgo(lastPointIso);
  const gpsHealth = gpsHealthVariant(isActive, accuracy, lastPointSeconds);
  const runningInExpoGo = isExpoGo();
  const gpsStatusChip =
    runningInExpoGo && isActive
      ? { label: "Foreground only", variant: "amber" as const }
      : {
          label: gpsHealth.label,
          variant: (gpsHealth.variant === "gray" ? "gray" : gpsHealth.variant) as "green" | "amber" | "red" | "gray"
        };
  const accuracyTone = accuracyVariant(accuracy);

  function openBuildApkPage() {
    void Linking.openURL(getExpoBuildUrl()).catch(() => undefined);
  }

  const loadStats = useCallback(async () => {
    await migrateLegacyGpsQueueIfNeeded();
    setBufferStatus(getGpsBufferStatus());
    setBatteryPercent(await getBatteryPercent());

    const [workStatus, visits] = await Promise.all([
      fetchWorkStatus().catch(() => ({ is_active: isActive, distance_km: 0, workday_id: undefined })),
      getHomeVisits({ pageSize: 100 }).catch(() => ({ visits: [] }))
    ]);

    setDistanceKm(workStatus.distance_km ?? 0);
    const today = new Date();
    setVisitsToday(visits.visits.filter((v) => isSameVisitLocalDay(v, today)).length);

    if (workStatus.workday_id) {
      try {
        const points = await getAllWorkdayLocations(workStatus.workday_id);
        setGpsPointsLogged(points.length);
      } catch {
        setGpsPointsLogged(pendingSyncCount);
      }
    } else {
      setGpsPointsLogged(pendingSyncCount);
    }
  }, [isActive, pendingSyncCount]);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
      void refreshTracking().catch(() => undefined);
    }, [loadStats, refreshTracking])
  );

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  useEffect(() => {
    const timer = setInterval(() => {
      setBufferStatus(getGpsBufferStatus());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadStats(), refreshTracking().catch(() => undefined)]);
    setRefreshing(false);
  }

  async function handleSyncGps() {
    setSyncingGps(true);
    try {
      await flushGpsBuffer();
      setBufferStatus(getGpsBufferStatus());
      await refreshTracking();
      await loadStats();
    } catch (err) {
      Alert.alert("Sync failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSyncingGps(false);
    }
  }

  const pending = bufferStatus.pending || pendingSyncCount;

  return (
    <View style={[styles.screen, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={18} color={Colors.text1} />
        </Pressable>
        <Text style={styles.headerTitle}>Today&apos;s tracking</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} {...refreshControlProps} />
        }
      >
        {runningInExpoGo ? <ExpoGoGpsBanner onBuildApk={openBuildApkPage} /> : null}

        {isActive ? (
          <View style={styles.heroActive}>
            <View style={styles.heroTopRow}>
              <View style={styles.activeRow}>
                <View style={styles.activeDot} />
                <Text style={styles.activeLabel}>Workday active</Text>
              </View>
            </View>
            <Text style={styles.liveTimer}>{liveTimer}</Text>
            <Text style={styles.startedAt}>Started {formatStartedTime(startedAt)}</Text>
            <View style={styles.heroStats}>
              <StatCell label="Distance km" value={distanceKm.toFixed(1)} />
              <StatCell label="Duration hrs" value={durationHours} />
              <StatCell label="GPS points" value={String(gpsPointsLogged)} />
            </View>
          </View>
        ) : (
          <View style={styles.heroIdle}>
            <Text style={styles.idleTitle}>Workday not started</Text>
            <Text style={styles.idleSub}>Start your workday to record GPS route and field time.</Text>
            <PrimaryButton
              label="Start workday"
              onPress={() => void startDay()}
              loading={busy}
              disabled={busy}
              style={styles.startBtn}
            />
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>GPS status</Text>
            <StatusChip label={gpsStatusChip.label} variant={gpsStatusChip.variant} />
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Accuracy</Text>
            <StatusChip
              label={accuracy != null ? `±${Math.round(accuracy)}m` : "—"}
              variant={accuracyTone}
            />
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Last point</Text>
            <Text style={styles.healthValue}>
              {lastPointSeconds != null ? `${lastPointSeconds}s ago` : "No point yet"}
            </Text>
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Battery</Text>
            <Text style={styles.healthValue}>{batteryPercent != null ? `${batteryPercent}%` : "—"}</Text>
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Network</Text>
            <Text style={styles.healthValue}>{online ? "Online" : "Offline"}</Text>
          </View>
          {gpsState === "denied" ? (
            <Text style={styles.gpsWarn}>Location permission denied — enable GPS for tracking.</Text>
          ) : null}
        </View>

        <View style={styles.todayGrid}>
          <TodayStatCard label="Distance traveled" value={`${distanceKm.toFixed(1)} km`} />
          <TodayStatCard label="Active duration" value={`${durationHours}h`} />
          <TodayStatCard label="GPS points logged" value={String(gpsPointsLogged)} />
          <TodayStatCard label="Visits done" value={String(visitsToday)} />
        </View>

        {pending > 0 ? (
          <View style={styles.bufferPending}>
            <Text style={styles.bufferTitle}>{pending} points pending sync</Text>
            <NeonProgressBar progress={bufferStatus.percent / 100} height={4} style={styles.progressTrack} />
            <Text style={styles.bufferMeta}>{bufferStatus.percent}% of buffer ({bufferStatus.max} max)</Text>
            <Pressable
              onPress={() => void handleSyncGps()}
              disabled={syncingGps}
              style={[styles.syncGpsBtn, syncingGps && styles.syncGpsBtnDisabled]}
            >
              {syncingGps ? (
                <ActivityIndicator color={Colors.amberText} size="small" />
              ) : (
                <Text style={styles.syncGpsText}>Sync GPS now</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.bufferSynced}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.greenText} />
            <View style={styles.bufferSyncedCopy}>
              <Text style={styles.bufferSyncedTitle}>All GPS synced</Text>
              <Text style={styles.bufferSyncedSub}>
                {bufferStatus.lastSyncAt || lastSyncTime
                  ? `Last sync ${new Date(bufferStatus.lastSyncAt || lastSyncTime!).toLocaleTimeString()}`
                  : "No pending route points"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingVertical: 10
  },
  iconBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  headerTitle: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  scroll: {
    gap: 12,
    paddingBottom: 32
  },
  expoGoBanner: {
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    marginHorizontal: Spacing.screen,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  expoGoBannerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  expoGoBannerTitle: {
    color: "#92400e",
    fontSize: 13,
    fontWeight: FontWeight.bold
  },
  expoGoBannerBody: {
    color: "#92400e",
    fontSize: 12,
    lineHeight: 17
  },
  expoGoBuildBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderColor: "#fde68a",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  expoGoBuildBtnText: {
    color: "#92400e",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  heroActive: {
    backgroundColor: Colors.brand700,
    borderRadius: Radius.card,
    gap: 10,
    marginHorizontal: Spacing.screen,
    padding: 18
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  activeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  activeDot: {
    backgroundColor: Colors.green,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  activeLabel: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  liveTimer: {
    color: Colors.surface,
    fontSize: FontSize.stat,
    fontWeight: FontWeight.bold
  },
  startedAt: {
    color: Colors.brand300,
    fontSize: FontSize.sm
  },
  heroStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },
  heroStatCell: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: Radius.md,
    flex: 1,
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  heroStatValue: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  heroStatLabel: {
    color: Colors.brand100,
    fontSize: FontSize.xs
  },
  heroIdle: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: Spacing.screen,
    padding: 18
  },
  idleTitle: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  idleSub: {
    color: Colors.text3,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  startBtn: {
    marginTop: 4
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: Spacing.screen,
    padding: 14
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  cardTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  healthRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  healthLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  healthValue: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  gpsWarn: {
    color: Colors.amberText,
    fontSize: FontSize.sm
  },
  todayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: Spacing.screen
  },
  todayCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 4,
    minHeight: 78,
    padding: 12,
    width: "48.5%"
  },
  todayValue: {
    color: Colors.text1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold
  },
  todayLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  bufferPending: {
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.card,
    gap: 10,
    marginHorizontal: Spacing.screen,
    padding: 14
  },
  bufferTitle: {
    color: Colors.amberText,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: Radius.pill,
    height: 8,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: Colors.amber,
    borderRadius: Radius.pill,
    height: "100%"
  },
  bufferMeta: {
    color: Colors.amberText,
    fontSize: FontSize.sm
  },
  syncGpsBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.amber,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 10
  },
  syncGpsBtnDisabled: {
    opacity: 0.7
  },
  syncGpsText: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  bufferSynced: {
    alignItems: "center",
    backgroundColor: Colors.greenBg,
    borderRadius: Radius.card,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: Spacing.screen,
    padding: 14
  },
  bufferSyncedCopy: {
    flex: 1,
    gap: 2
  },
  bufferSyncedTitle: {
    color: Colors.greenText,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  bufferSyncedSub: {
    color: Colors.greenText,
    fontSize: FontSize.sm
  }
});
