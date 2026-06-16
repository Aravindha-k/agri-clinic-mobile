import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";
import { SectionHeader } from "../ui/SectionHeader";

type Props = {
  title: string;
  distanceLabel: string;
  distanceValue: string;
  routePointsLabel: string;
  routePointsValue: string | number;
  lastSyncLabel: string;
  lastSyncValue: string;
  pendingGpsLabel?: string | null;
  syncStatusLabel?: string | null;
  viewRouteLabel: string;
  openTrackingLabel: string;
  syncNowLabel: string;
  syncing?: boolean;
  showSyncAction?: boolean;
  onViewRoute: () => void;
  onOpenTracking: () => void;
  onSyncNow?: () => void;
};

export function RouteSyncCard({
  title,
  distanceLabel,
  distanceValue,
  routePointsLabel,
  routePointsValue,
  lastSyncLabel,
  lastSyncValue,
  pendingGpsLabel,
  syncStatusLabel,
  viewRouteLabel,
  openTrackingLabel,
  syncNowLabel,
  syncing = false,
  showSyncAction = false,
  onViewRoute,
  onOpenTracking,
  onSyncNow
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.headerPad}>
        <SectionHeader title={title} />
      </View>
      <FlatCard style={styles.card}>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{distanceValue}</Text>
            <Text style={styles.metricLabel}>{distanceLabel}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{routePointsValue}</Text>
            <Text style={styles.metricLabel}>{routePointsLabel}</Text>
          </View>
        </View>

        <View style={styles.syncBlock}>
          <View style={styles.syncRow}>
            <Ionicons name="sync-outline" size={14} color={Colors.text3} />
            <Text style={styles.syncKey}>{lastSyncLabel}</Text>
            <Text style={styles.syncValue}>{lastSyncValue}</Text>
          </View>
          {pendingGpsLabel ? <Text style={styles.pending}>{pendingGpsLabel}</Text> : null}
          {syncStatusLabel ? <Text style={styles.status}>{syncStatusLabel}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onViewRoute}
            style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="map-outline" size={15} color={Colors.brand700} />
            <Text style={styles.outlineBtnText}>{viewRouteLabel}</Text>
          </Pressable>
          <Pressable
            onPress={onOpenTracking}
            style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="navigate-outline" size={15} color={Colors.brand700} />
            <Text style={styles.outlineBtnText}>{openTrackingLabel}</Text>
          </Pressable>
        </View>

        {showSyncAction && onSyncNow ? (
          <Pressable
            onPress={onSyncNow}
            disabled={syncing}
            style={({ pressed }) => [styles.syncBtn, pressed && { opacity: 0.92 }, syncing && { opacity: 0.7 }]}
          >
            {syncing ? (
              <ActivityIndicator color={Colors.surface} size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color={Colors.surface} />
                <Text style={styles.syncBtnText}>{syncNowLabel}</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </FlatCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
    marginTop: Spacing.lg
  },
  headerPad: {
    paddingHorizontal: Spacing.lg
  },
  card: {
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: Spacing.cardLg
  },
  metrics: {
    alignItems: "center",
    flexDirection: "row"
  },
  metric: {
    alignItems: "center",
    flex: 1,
    gap: 2
  },
  metricValue: {
    color: Colors.text1,
    fontSize: FontSize.h1,
    fontVariant: ["tabular-nums"],
    fontWeight: FontWeight.bold
  },
  metricLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: "center"
  },
  divider: {
    backgroundColor: Colors.border,
    height: 36,
    width: StyleSheet.hairlineWidth
  },
  syncBlock: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.inner,
    borderWidth: 1,
    gap: 4,
    padding: Spacing.md
  },
  syncRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  syncKey: {
    color: Colors.text3,
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  syncValue: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  pending: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: 2
  },
  status: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    marginTop: 2
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm
  },
  outlineBtn: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: Radius.button,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    height: Layout.touchTargetMin - 6,
    justifyContent: "center"
  },
  outlineBtnText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  syncBtn: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: Radius.button,
    flexDirection: "row",
    gap: 8,
    height: Layout.touchTargetMin - 4,
    justifyContent: "center"
  },
  syncBtnText: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  }
});
