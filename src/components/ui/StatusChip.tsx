import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

export type StatusChipVariant =
  | "online"
  | "offline"
  | "synced"
  | "pending"
  | "working"
  | "completed"
  | "warning";

const CHIP_META: Record<
  StatusChipVariant,
  { label: string; icon: keyof typeof Ionicons.glyphMap; tone: "success" | "warning" | "danger" | "muted" | "primary" }
> = {
  online: { label: "Online", icon: "wifi", tone: "success" },
  offline: { label: "Offline", icon: "cloud-offline", tone: "warning" },
  synced: { label: "Synced", icon: "checkmark-circle", tone: "success" },
  pending: { label: "Pending", icon: "time", tone: "warning" },
  working: { label: "On duty", icon: "radio-button-on", tone: "success" },
  completed: { label: "Done", icon: "checkmark-done", tone: "primary" },
  warning: { label: "Attention", icon: "alert-circle", tone: "warning" }
};

type Props = {
  variant: StatusChipVariant;
  label?: string;
  compact?: boolean;
};

export function StatusChip({ variant, label, compact }: Props) {
  const { colors } = useDesignSystem();
  const meta = CHIP_META[variant];
  const bg =
    meta.tone === "success"
      ? colors.successSoft
      : meta.tone === "warning"
        ? colors.warningSoft
        : meta.tone === "danger"
          ? colors.dangerSoft
          : meta.tone === "primary"
            ? colors.primarySoft
            : colors.cardMuted;
  const fg =
    meta.tone === "success"
      ? colors.success
      : meta.tone === "warning"
        ? colors.warning
        : meta.tone === "danger"
          ? colors.danger
          : meta.tone === "primary"
            ? colors.primaryDark
            : colors.muted;

  return (
    <View style={[styles.chip, compact && styles.compact, { backgroundColor: bg }]}>
      <Ionicons name={meta.icon} size={compact ? 12 : 14} color={fg} />
      <Text style={[styles.text, compact && styles.textCompact, { color: fg }]}>{label ?? meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  compact: { paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: "800" },
  textCompact: { fontSize: 11 }
});
