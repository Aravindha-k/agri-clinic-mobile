import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { AppHeader, PremiumCard, PrimaryButton } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import { useGpsWorkGuard } from "../hooks/useGpsWorkGuard";
import { useOfflineSync } from "../storage/OfflineSyncContext";
import { useTheme } from "../theme";
import { refreshControlProps } from "../theme/refresh";
import { formatDisplayDateTime } from "../utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "OfflineSync">;

export function OfflineSyncScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { queue, syncing, syncAll, refreshQueue, lastSyncAt } = useOfflineSync();
  const { canRunWorkAction } = useGpsWorkGuard();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshQueue();
    setRefreshing(false);
  }, [refreshQueue]);

  const count = queue.length;

  return (
    <View style={[styles.screen, { backgroundColor: c.offlineBackground, flex: 1 }]}>
      <AppHeader
        title="Offline sync"
        subtitle={count ? `${count} visit${count === 1 ? "" : "s"} queued` : "All visits synced"}
        variant="dark"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.hero}>
        <View style={styles.cloudWrap}>
          <Ionicons name="cloud-upload" size={40} color={c.primaryLight} />
          <View style={styles.cloudRing} />
        </View>
        <Text style={[styles.heroTitle, { color: c.offlineText }]}>
          {count ? "Waiting to upload" : "You're all caught up"}
        </Text>
        <Text style={[styles.heroSub, { color: c.offlineMuted }]}>
          {count ? "Visits save locally and sync when you're online." : "Every field visit has been sent to the server."}
        </Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton
          title={syncing ? "Syncing…" : "Sync now"}
          onPress={() => {
            if (!canRunWorkAction()) return;
            void syncAll();
          }}
          loading={syncing}
          disabled={!count}
        />
        {lastSyncAt ? <Text style={[styles.meta, { color: c.offlineMuted }]}>Last sync: {formatDisplayDateTime(lastSyncAt)}</Text> : null}
      </View>
      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
        contentContainerStyle={[styles.list, !count && styles.listEmpty]}
        ListEmptyComponent={
          <EmptyState title="All synced" message="No visits waiting to upload." illustration="sync" />
        }
        renderItem={({ item }) => (
          <PremiumCard elevated style={{ backgroundColor: c.offlineCard }}>
            <View style={styles.rowTop}>
              <Ionicons name="cloud-upload-outline" size={20} color={c.primaryLight} />
              <Text style={[styles.name, { color: c.offlineText }]}>{item.values.farmer_name || "Farmer"}</Text>
            </View>
            <Text style={{ color: c.offlineMuted, fontSize: 13, marginTop: 6 }}>{formatDisplayDateTime(item.createdAt)}</Text>
            {item.lastError ? <Text style={{ color: c.danger, fontSize: 13, marginTop: 8 }}>{item.lastError}</Text> : null}
            <Text style={{ color: c.offlineMuted, fontSize: 12, marginTop: 6 }}>Attempts: {item.attempts}</Text>
          </PremiumCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  cloudWrap: {
    alignItems: "center",
    height: 88,
    justifyContent: "center",
    marginBottom: 14,
    width: 88
  },
  cloudRing: {
    borderColor: "rgba(95,214,142,0.35)",
    borderRadius: 999,
    borderWidth: 2,
    height: 88,
    position: "absolute",
    width: 88
  },
  heroTitle: { fontSize: 20, fontWeight: "900", textAlign: "center" },
  heroSub: { fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  actions: { gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  list: { gap: 12, padding: 16, paddingBottom: 32 },
  listEmpty: { flexGrow: 1 },
  meta: { fontSize: 12, textAlign: "center" },
  rowTop: { alignItems: "center", flexDirection: "row", gap: 10 },
  name: { flex: 1, fontSize: 16, fontWeight: "900" }
});
