import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PremiumCard } from "../brand/PremiumCard";
import { useTheme } from "../../theme";
import { space } from "../../theme/layout";

type CardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  hint?: string;
  tint?: "primary" | "warning" | "success" | "soft";
  onPress?: () => void;
};

const DashCard = memo(function DashCard({ icon, label, value, hint, tint = "soft", onPress }: CardProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const iconBg =
    tint === "warning" ? c.warningSoft : tint === "success" ? c.successSoft : tint === "primary" ? c.primarySoft : c.cardMuted;

  const content = (
    <PremiumCard elevated tint={tint === "primary" ? "primary" : "soft"} style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={c.primaryDark} />
      </View>
      <Text style={[styles.value, { color: c.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, { color: c.muted }]} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: c.muted }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </PremiumCard>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
});

type Props = {
  visitsToday: number;
  farmersCount: number;
  pendingVisitSync: number;
  pendingLocationPoints: number;
  gpsLabel: string;
  gpsTint: "primary" | "warning" | "success";
  onFarmersPress?: () => void;
  onSyncPress?: () => void;
};

export const HomeDashboardCards = memo(function HomeDashboardCards({
  visitsToday,
  farmersCount,
  pendingVisitSync,
  pendingLocationPoints,
  gpsLabel,
  gpsTint,
  onFarmersPress,
  onSyncPress
}: Props) {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <View style={styles.cell}>
          <DashCard icon="clipboard-outline" label="Today's visits" value={visitsToday} tint="primary" />
        </View>
        <View style={styles.cell}>
          <DashCard
            icon="people-outline"
            label="Farmers"
            value={farmersCount}
            hint="Assigned"
            onPress={onFarmersPress}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <DashCard
            icon="cloud-upload-outline"
            label="Pending sync"
            value={pendingVisitSync}
            hint={pendingVisitSync ? "Tap to sync" : "All clear"}
            tint={pendingVisitSync ? "warning" : "success"}
            onPress={onSyncPress}
          />
        </View>
        <View style={styles.cell}>
          <DashCard icon="navigate-outline" label="GPS" value={gpsLabel} tint={gpsTint} />
        </View>
      </View>
      {pendingLocationPoints > 0 ? (
        <PremiumCard elevated tint="soft" style={styles.queueBanner}>
          <Ionicons name="trail-sign-outline" size={18} color="#2EE66A" />
          <Text style={styles.queueText}>
            {pendingLocationPoints} route point{pendingLocationPoints === 1 ? "" : "s"} queued — will upload on next sync
          </Text>
        </PremiumCard>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  cell: { flex: 1 },
  card: { gap: 4, minHeight: 96, paddingVertical: 12 },
  iconWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  value: { fontSize: 22, fontWeight: "900", marginTop: 6 },
  label: { fontSize: 12, fontWeight: "600" },
  hint: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  pressed: { opacity: 0.92 },
  queueBanner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10
  },
  queueText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 }
});
