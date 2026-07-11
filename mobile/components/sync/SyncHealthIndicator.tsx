import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useSyncStore, type SyncHealthState } from "../../lib/store/syncStore";
import { getFieldPendingCounts } from "../../lib/sync/pendingCounts";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  onPress?: () => void;
};

function resolveHealthLabel(
  health: SyncHealthState,
  t: (key: string) => string,
  pendingTotal: number
): { label: string; icon: keyof typeof Ionicons.glyphMap; tone: "ok" | "warn" | "info" | "danger" } {
  switch (health) {
    case "synced":
      return { label: t("syncHealth.synced"), icon: "checkmark-circle", tone: "ok" };
    case "offline_saving":
      return { label: t("syncHealth.offlineSaving"), icon: "cloud-offline", tone: "warn" };
    case "syncing":
      return { label: t("syncHealth.syncing"), icon: "sync", tone: "info" };
    case "waiting_internet":
      return { label: t("syncHealth.waitingInternet"), icon: "wifi-outline", tone: "warn" };
    case "auth_required":
      return { label: t("syncHealth.authRequired"), icon: "lock-closed", tone: "danger" };
    case "attention_required":
      return {
        label: t("syncHealth.attentionRequired"),
        icon: "alert-circle",
        tone: "danger"
      };
    default:
      return {
        label: pendingTotal > 0 ? t("syncHealth.syncing") : t("syncHealth.synced"),
        icon: pendingTotal > 0 ? "sync" : "checkmark-circle",
        tone: pendingTotal > 0 ? "info" : "ok"
      };
  }
}

const toneStyles = {
  ok: { bg: Colors.greenBg, text: Colors.greenText, border: Colors.border },
  warn: { bg: Colors.amberBg, text: Colors.amberText, border: Colors.border },
  info: { bg: Colors.brand50, text: Colors.brand700, border: Colors.border },
  danger: { bg: Colors.redBg, text: Colors.red, border: Colors.border }
} as const;

export function SyncHealthIndicator({ onPress }: Props) {
  const { t } = useI18n();
  const online = useConnectivityOnline();
  const syncHealth = useSyncStore((s) => s.syncHealth);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const counts = getFieldPendingCounts();

  const effectiveHealth: SyncHealthState =
    !online && counts.total > 0 ? "offline_saving" : isSyncing ? "syncing" : syncHealth;

  const { label, icon, tone } = resolveHealthLabel(effectiveHealth, t, counts.total);
  const palette = toneStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.wrap,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: pressed ? 0.92 : 1
        }
      ]}
    >
      <Ionicons name={icon} size={14} color={palette.text} />
      <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
      {counts.total > 0 ? (
        <View style={[styles.countPill, { backgroundColor: palette.text }]}>
          <Text style={styles.countText}>{counts.total}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={14} color={palette.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.xs,
    marginHorizontal: Spacing.screen,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  label: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  countPill: {
    borderRadius: Radius.pill,
    minWidth: 18,
    paddingHorizontal: 6,
    paddingVertical: 1
  },
  countText: {
    color: Colors.surface,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  }
});
