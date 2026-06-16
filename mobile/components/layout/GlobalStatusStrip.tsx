import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { autoFlushPendingGps } from "../../lib/sync/offlineSyncManager";
import { useSyncStore } from "../../lib/store/syncStore";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../../lib/theme";

type StripMode = "hidden" | "offline" | "sync";

function resolveMode(input: { offline: boolean; pendingVisits: number }): StripMode {
  if (input.offline) return "offline";
  if (input.pendingVisits > 0) return "sync";
  return "hidden";
}

export function GlobalStatusStrip() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const apiOnline = useConnectivityOnline();
  const [netOffline, setNetOffline] = useState(false);
  const { pendingCount, syncAll } = useOfflineSync();
  const pendingGps = useSyncStore((s) => s.pendingGPSCount);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setNetOffline(offline);
    });
    return unsub;
  }, []);

  // Route GPS uploads happen automatically — employees never tap Sync for this.
  useEffect(() => {
    if (pendingGps <= 0 || netOffline || !apiOnline) return;
    const timer = setTimeout(() => {
      void autoFlushPendingGps();
    }, 800);
    return () => clearTimeout(timer);
  }, [apiOnline, netOffline, pendingGps]);

  const offline = netOffline || !apiOnline;
  const mode = useMemo(
    () =>
      resolveMode({
        offline,
        pendingVisits: pendingCount
      }),
    [offline, pendingCount]
  );

  if (mode === "hidden") {
    return null;
  }

  const bg = Colors.amberBg;
  const iconColor = Colors.amberText;

  let message = "";
  if (mode === "offline") {
    const parts = ["Offline"];
    if (pendingCount > 0) parts.push(`${pendingCount} visit${pendingCount === 1 ? "" : "s"} pending`);
    message = parts.join(" · ");
  } else {
    message = `${pendingCount} visit${pendingCount === 1 ? "" : "s"} pending sync`;
  }

  const iconName = mode === "offline" ? "cloud-offline-outline" : "cloud-upload-outline";

  function onSyncPress() {
    const root = navigation.getParent();
    if (pendingCount > 0) {
      void syncAll();
      return;
    }
    root?.navigate("OfflineSync");
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.xs, backgroundColor: bg }]}>
      <Ionicons name={iconName} size={16} color={iconColor} />
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {pendingCount > 0 ? (
        <Pressable onPress={onSyncPress} hitSlop={8} accessibilityRole="button">
          <Text style={styles.action}>Sync</Text>
        </Pressable>
      ) : null}
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
  },
  action: {
    color: Colors.brand700,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold
  }
});
