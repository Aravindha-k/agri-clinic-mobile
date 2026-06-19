import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { autoFlushPendingGps } from "../../lib/sync/offlineSyncManager";
import { useSyncStore } from "../../lib/store/syncStore";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../../lib/theme";

type StripMode = "hidden" | "offline" | "syncing";

function resolveMode(input: { offline: boolean; pendingVisits: number; syncing: boolean }): StripMode {
  if (input.offline && input.pendingVisits > 0) return "offline";
  if (input.pendingVisits > 0) return "syncing";
  return "hidden";
}

export function GlobalStatusStrip() {
  const insets = useSafeAreaInsets();
  const apiOnline = useConnectivityOnline();
  const [netOffline, setNetOffline] = useState(false);
  const { pendingCount, syncAll, syncing } = useOfflineSync();
  const pendingGps = useSyncStore((s) => s.pendingGPSCount);
  const autoSyncStarted = useRef(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setNetOffline(offline);
    });
    return unsub;
  }, []);

  // GPS route uploads — fully automatic, never shown to employee.
  useEffect(() => {
    if (pendingGps <= 0 || netOffline || !apiOnline) return;
    const timer = setTimeout(() => {
      void autoFlushPendingGps();
    }, 800);
    return () => clearTimeout(timer);
  }, [apiOnline, netOffline, pendingGps]);

  // Pending visits sync automatically when back online.
  useEffect(() => {
    if (pendingCount <= 0 || netOffline || !apiOnline || syncing) {
      autoSyncStarted.current = false;
      return;
    }
    if (autoSyncStarted.current) return;
    autoSyncStarted.current = true;
    void syncAll().finally(() => {
      autoSyncStarted.current = false;
    });
  }, [apiOnline, netOffline, pendingCount, syncAll, syncing]);

  const offline = netOffline || !apiOnline;
  const mode = useMemo(
    () =>
      resolveMode({
        offline,
        pendingVisits: pendingCount,
        syncing
      }),
    [offline, pendingCount, syncing]
  );

  if (mode === "hidden") {
    return null;
  }

  const bg = Colors.amberBg;
  const iconColor = Colors.amberText;

  const message =
    mode === "offline"
      ? `Offline · ${pendingCount} visit${pendingCount === 1 ? "" : "s"} will sync when online`
      : syncing
        ? `Syncing ${pendingCount} visit${pendingCount === 1 ? "" : "s"}…`
        : `${pendingCount} visit${pendingCount === 1 ? "" : "s"} syncing automatically`;

  const iconName = mode === "offline" ? "cloud-offline-outline" : "sync-outline";

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.xs, backgroundColor: bg }]}>
      <Ionicons name={iconName} size={16} color={iconColor} />
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: Layout.cardBorderWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 40,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    zIndex: 9998
  },
  message: {
    color: Colors.text2,
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    lineHeight: 18
  }
});
