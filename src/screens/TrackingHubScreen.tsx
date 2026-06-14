import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { TrackingLocationMap } from "../components/TrackingLocationMap";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { PageHeader } from "../components/ui/PageHeader";
import { KpiCard } from "../components/ui/KpiCard";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { StatusChip } from "../components/ui/StatusChip";
import { WorkdayStatusCard } from "../components/home/WorkdayStatusCard";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { useRefreshControlProps } from "../hooks/useRefreshControlProps";
import { useConnectivityOnline } from "../hooks/useConnectivityOnline";
import { useTracking } from "../storage/TrackingContext";
import { formatShortDateTime } from "../utils/format";

export function TrackingHubScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent()?.getParent();
  const { colors, type, shadows } = useDesignSystem();
  const online = useConnectivityOnline();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const [refreshing, setRefreshing] = useState(false);
  const {
    busy,
    isActive,
    startedAt,
    lastSyncTime,
    nextSyncAt,
    pendingSyncCount,
    elapsedDuration,
    currentLocation,
    loading,
    refreshTracking,
    startDay,
  } = useTracking();

  async function onRefresh() {
    setRefreshing(true);
    await refreshTracking().catch(() => undefined);
    setRefreshing(false);
  }

  if (loading && !isActive) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: tabInset + 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} {...refreshControlProps} />}
    >
      <PageHeader
        title="Tracking"
        subtitle={isActive ? "Live route recording" : "Start workday to track"}
        right={
          <View style={styles.headerChips}>
            <StatusChip variant={online ? "online" : "offline"} compact />
            <StatusChip variant={isActive ? "working" : "offline"} compact />
          </View>
        }
      />

      <View style={[styles.mapShell, shadows.elevated]}>
        <TrackingLocationMap
          isActive={isActive}
          serverLatitude={currentLocation?.latitude}
          serverLongitude={currentLocation?.longitude}
          accuracyMeters={currentLocation?.accuracy}
        />
        <Pressable
          onPress={() => rootNav?.navigate("LiveMap")}
          style={[styles.mapOverlay, { backgroundColor: colors.card }]}
        >
          <Ionicons name="expand-outline" size={18} color={colors.primary} />
          <Text style={[type.bodyStrong, { color: colors.primary }]}>Open live map</Text>
        </Pressable>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCell}>
          <KpiCard
            icon="pulse-outline"
            label="Route points queued"
            value={pendingSyncCount}
            hint={lastSyncTime ? `Last ${formatShortDateTime(lastSyncTime)}` : "No sync yet"}
          />
        </View>
        <View style={styles.kpiCell}>
          <KpiCard
            icon="timer-outline"
            label="Field time"
            value={isActive ? elapsedDuration || "—" : "Off"}
            accent={isActive}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <WorkdayStatusCard
          isActive={isActive}
          startedAt={startedAt}
          lastSyncTime={lastSyncTime}
          nextSyncAt={nextSyncAt}
          busy={busy}
          elapsedLabel={isActive ? elapsedDuration : undefined}
          onStart={() => void startDay()}
          onLiveMap={() => rootNav?.navigate("LiveMap")}
        />
      </View>

      <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
        <Text style={type.sectionTitle}>Route history</Text>
        <Text style={[type.meta, { marginTop: 4 }]}>Review completed workday paths and distance on the map.</Text>
        <PrimaryButton
          title="View route history"
          variant="secondary"
          onPress={() => rootNav?.navigate("TravelHistory")}
          style={{ marginTop: 12 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerChips: { flexDirection: "row", gap: 6 },
  mapShell: {
    borderRadius: 18,
    marginHorizontal: 16,
    overflow: "hidden"
  },
  mapOverlay: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 12
  },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  kpiCell: { flex: 1 },
  historyCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    padding: 16
  }
});
