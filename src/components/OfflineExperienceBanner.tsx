import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useConnectivityOnline } from "../hooks/useConnectivityOnline";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { useGpsWorkGuard } from "../hooks/useGpsWorkGuard";
import { useOfflineSync } from "../storage/OfflineSyncContext";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { StatusChip } from "./ui/StatusChip";

type Props = {
  onPressSync?: () => void;
  compact?: boolean;
};

/** Intentional offline UX: pending count, last sync, sync now. */
export function OfflineExperienceBanner({ onPressSync, compact }: Props) {
  const online = useConnectivityOnline();
  const { colors, type } = useDesignSystem();
  const { pendingCount, syncing, lastSyncAt, syncAll } = useOfflineSync();
  const { canRunWorkAction } = useGpsWorkGuard();

  const show = !online || pendingCount > 0 || syncing;
  if (!show) return null;

  const pendingLine =
    pendingCount > 0
      ? `${pendingCount} visit${pendingCount === 1 ? "" : "s"} waiting to sync`
      : syncing
        ? "Syncing visits…"
        : null;

  const syncLine = lastSyncAt ? `Last synced ${formatRelativeTime(lastSyncAt)}` : "Not synced yet";

  async function handleSyncNow() {
    if (onPressSync && !canRunWorkAction()) return;
    if (!canRunWorkAction()) return;
    if (pendingCount > 0) {
      await syncAll();
      return;
    }
    onPressSync?.();
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: online ? colors.card : colors.warningSoft,
          borderColor: online ? colors.borderSubtle : colors.warning
        }
      ]}
    >
      <View style={styles.topRow}>
        <StatusChip variant={online ? "pending" : "offline"} compact />
        <View style={styles.copy}>
          {!online ? <Text style={[type.bodyStrong, { color: colors.text }]}>You&apos;re offline</Text> : null}
          {pendingLine ? <Text style={[type.bodyStrong, { color: colors.text }]}>{pendingLine}</Text> : null}
          {!compact ? <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{syncLine}</Text> : null}
        </View>
        {onPressSync ? (
          <Pressable onPress={onPressSync} hitSlop={8}>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {(pendingCount > 0 || !online) && (
        <Pressable
          onPress={() => void handleSyncNow()}
          disabled={syncing || (!pendingCount && online)}
          style={({ pressed }) => [
            styles.syncBtn,
            {
              backgroundColor: colors.primary,
              opacity: syncing || (!pendingCount && online) ? 0.55 : pressed ? 0.9 : 1
            }
          ]}
        >
          <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
          <Text style={styles.syncBtnText}>{syncing ? "Syncing…" : "Sync now"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12
  },
  topRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  copy: { flex: 1, gap: 2 },
  syncBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  syncBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }
});
