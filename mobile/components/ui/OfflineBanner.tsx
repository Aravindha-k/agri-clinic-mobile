import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { LAN_OFFLINE_BANNER_MESSAGE } from "../../lib/api";
import { Colors, FontSize, FontWeight, Radius } from "../../lib/theme";

type Props = {
  pendingCount: number;
  lastSyncedAt: Date | null;
  /** Called automatically when visits are pending and device is online. */
  onAutoSync?: () => void;
  offline?: boolean;
  lanOnly?: boolean;
  syncing?: boolean;
};

function formatLastSync(date: Date | null): string {
  if (!date) return "never";
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function OfflineBanner({
  pendingCount,
  lastSyncedAt,
  onAutoSync,
  offline = false,
  lanOnly = false,
  syncing = false
}: Props) {
  const apiOnline = useConnectivityOnline();
  const deviceOffline = offline || lanOnly || !apiOnline;

  useEffect(() => {
    if (!onAutoSync || pendingCount <= 0 || deviceOffline || syncing) return;
    onAutoSync();
  }, [deviceOffline, onAutoSync, pendingCount, syncing]);

  if (pendingCount <= 0 && !deviceOffline) {
    return null;
  }

  const message = lanOnly
    ? LAN_OFFLINE_BANNER_MESSAGE
    : deviceOffline
      ? pendingCount > 0
        ? `Offline · ${pendingCount} visit${pendingCount === 1 ? "" : "s"} will sync when online`
        : "Offline"
      : syncing
        ? `Syncing ${pendingCount} visit${pendingCount === 1 ? "" : "s"}…`
        : `${pendingCount} visit${pendingCount === 1 ? "" : "s"} syncing automatically`;

  return (
    <View style={[styles.wrap, { backgroundColor: Colors.amberBg, borderRadius: Radius.lg }]}>
      <Ionicons
        name={deviceOffline ? "cloud-offline-outline" : syncing ? "sync-outline" : "cloud-upload-outline"}
        size={18}
        color={Colors.amber}
      />
      <Text style={[styles.copy, { color: Colors.amberText }]} numberOfLines={2}>
        {message}
        {lastSyncedAt ? ` · Last sync ${formatLastSync(lastSyncedAt)}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  copy: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  }
});
