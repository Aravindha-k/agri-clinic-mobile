import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, AppState, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { ErrorState } from "../components/ErrorState";
import { FadeInView } from "../components/FadeInView";
import { ListSkeleton } from "../components/ListSkeleton";
import { TrackingLocationMap } from "../components/TrackingLocationMap";
import { TRACKING_LOAD_ERROR } from "../constants/trackingMessages";
import { useTracking } from "../storage/TrackingContext";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";
import { refreshControlProps } from "../theme/refresh";
import { typography } from "../theme/typography";
import { formatShortDateTime } from "../utils/format";

function gpsStatusLabel(state: "unknown" | "granted" | "denied") {
  if (state === "granted") return "GPS allowed";
  if (state === "denied") return "GPS denied or off";
  return "GPS status unknown";
}

export function TrackingScreen() {
  const {
    busy,
    currentLocation,
    endDay,
    error,
    gpsState,
    isActive,
    lastSyncTime,
    loading,
    pendingSyncCount,
    refreshTracking,
    retryForegroundSync,
    startDay,
    startedAt,
    syncIntervalMinutes
  } = useTracking();
  const [refreshing, setRefreshing] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setAppActive(next === "active");
    });
    return () => sub.remove();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refreshTracking();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleStartDay() {
    try {
      await startDay();
    } catch (err) {
      Alert.alert("Unable to start work", err instanceof Error ? err.message : "Please try again.");
    }
  }

  async function handleEndDay() {
    try {
      await endDay();
    } catch (err) {
      Alert.alert("Unable to end day", err instanceof Error ? err.message : "Please try again.");
    }
  }

  async function handleSyncNow() {
    try {
      await retryForegroundSync();
      Alert.alert("Sync complete", "Your latest GPS point was sent.");
    } catch {
      Alert.alert("Sync failed", "Could not send location. It will retry when you are back online.");
    }
  }

  if (loading) {
    return (
      <View style={styles.skeletonWrap}>
        <ListSkeleton rows={2} />
      </View>
    );
  }

  if (error && !isActive && error !== TRACKING_LOAD_ERROR) {
    return <ErrorState message={error} onRetry={() => void refreshTracking().catch(() => undefined)} />;
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <FadeInView>
        <AppCard elevated>
          <View style={styles.hero}>
            <View style={[styles.ring, isActive && styles.ringOn]}>
              <Ionicons name={isActive ? "navigate" : "moon-outline"} size={40} color={isActive ? colors.success : colors.muted} />
            </View>
            <Text style={styles.headline}>{isActive ? "Working today" : "Not started yet"}</Text>
            <Text style={styles.sub}>
              {isActive
                ? "You started work today. Check-ins save quietly while you visit farmers."
                : "When you begin field work today, tap below once. You can allow GPS when prompted."}
            </Text>
          </View>

          {isActive ? (
            <View style={styles.checkIn}>
              <Ionicons name="time-outline" size={20} color={colors.primaryDark} />
              <View style={styles.checkInText}>
                <Text style={styles.checkInLabel}>Last check-in saved</Text>
                <Text style={styles.checkInValue}>{lastSyncTime ? formatShortDateTime(lastSyncTime) : "Waiting for first save"}</Text>
              </View>
            </View>
          ) : null}

          {!isActive ? <AppButton title="Start work today" onPress={handleStartDay} loading={busy} style={styles.primaryBtn} /> : null}
        </AppCard>
      </FadeInView>

      {isActive ? (
        <FadeInView delay={40}>
          <AppCard elevated>
            <Text style={styles.locationCardTitle}>Sync status</Text>
            <View style={styles.statusGrid}>
              <StatusRow label="Workday" value="Active" />
              <StatusRow label="Last synced" value={lastSyncTime ? formatShortDateTime(lastSyncTime) : "Not yet"} />
              <StatusRow label="Pending uploads" value={pendingSyncCount > 0 ? `${pendingSyncCount} point` : "None"} />
              <StatusRow label="GPS" value={gpsStatusLabel(gpsState)} />
              <StatusRow label="Sync interval" value={`Every ${syncIntervalMinutes} min (foreground)`} />
            </View>
            {!appActive ? (
              <Text style={styles.bgNote}>
                Background tracking is disabled. Keep the app open or return here periodically for GPS check-ins.
              </Text>
            ) : null}
            {__DEV__ ? (
              <AppButton title="Sync Now" onPress={handleSyncNow} loading={busy} variant="secondary" style={styles.syncBtn} />
            ) : null}
          </AppCard>
        </FadeInView>
      ) : null}

      <FadeInView delay={60}>
        <AppCard elevated>
          <Text style={styles.locationCardTitle}>Your map</Text>
          <Text style={styles.locationCardBody}>
            {isActive ? "You are here. The pin shows your last saved check-in." : "Your position appears here when location is on."}
          </Text>
          <View style={styles.mapSlot}>
            <TrackingLocationMap
              isActive={isActive}
              serverLatitude={currentLocation?.latitude}
              serverLongitude={currentLocation?.longitude}
              accuracyMeters={currentLocation?.accuracy ?? null}
            />
          </View>
          {isActive && startedAt ? <Text style={styles.metaSmall}>Work started today · {formatShortDateTime(startedAt)}</Text> : null}
        </AppCard>
      </FadeInView>

      {isActive ? (
        <FadeInView delay={100}>
          <View style={styles.footer}>
            <Text style={styles.footerHint}>You usually do not need to end work—the app stops automatically after today’s limit.</Text>
            <AppButton title="End day" onPress={handleEndDay} loading={busy} variant="secondary" />
          </View>
        </FadeInView>
      ) : null}

      {error && isActive ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: {
    backgroundColor: colors.background,
    flex: 1,
    padding: space.lg
  },
  screen: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: space.md + 2,
    padding: space.lg,
    paddingBottom: space.xl + 12
  },
  hero: {
    alignItems: "center",
    paddingVertical: space.sm
  },
  ring: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 2,
    height: 88,
    justifyContent: "center",
    marginBottom: space.md,
    width: 88
  },
  ringOn: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft
  },
  headline: {
    ...typography.title,
    textAlign: "center"
  },
  sub: {
    ...typography.subtitle,
    marginTop: space.sm,
    textAlign: "center"
  },
  checkIn: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    flexDirection: "row",
    gap: space.md,
    marginTop: space.lg,
    padding: space.md
  },
  checkInText: {
    flex: 1
  },
  checkInLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  checkInValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2
  },
  primaryBtn: {
    marginTop: space.lg
  },
  syncBtn: {
    marginTop: space.md
  },
  locationCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  locationCardBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: space.sm
  },
  statusGrid: {
    gap: space.sm,
    marginTop: space.md
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md
  },
  statusLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: "600"
  },
  statusValue: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right"
  },
  bgNote: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 19,
    marginTop: space.md
  },
  metaSmall: {
    color: colors.muted,
    fontSize: 13,
    marginTop: space.sm
  },
  mapSlot: {
    marginTop: space.md
  },
  footer: {
    gap: space.sm
  },
  footerHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: space.xs
  },
  warn: {
    backgroundColor: colors.warningSoft,
    borderRadius: 10,
    padding: space.md
  },
  warnText: {
    color: colors.warning,
    fontSize: 14,
    textAlign: "center"
  }
});
