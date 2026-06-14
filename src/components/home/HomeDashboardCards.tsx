import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ClinicCard } from "../brand/ClinicCard";
import { useTheme } from "../../theme";

type CardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  onPress?: () => void;
};

const KpiCard = memo(function KpiCard({ icon, label, value, hint, accent = false, onPress }: CardProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const content = (
    <ClinicCard accent={accent} compact style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={22} color={c.primary} />
      </View>
      <Text style={[styles.value, { color: c.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, { color: c.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: c.muted }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </ClinicCard>
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
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.grid}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>Today at a Glance</Text>
      <View style={styles.row}>
        <View style={styles.cell}>
          <KpiCard icon="clipboard-outline" label="Visits today" value={visitsToday} />
        </View>
        <View style={styles.cell}>
          <KpiCard
            icon="people-outline"
            label="Farmers"
            value={farmersCount}
            hint="Assigned to you"
            onPress={onFarmersPress}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <KpiCard
            icon="cloud-upload-outline"
            label="Pending sync"
            value={pendingVisitSync}
            hint={pendingVisitSync ? "Tap to sync" : "All clear"}
            accent={pendingVisitSync > 0}
            onPress={onSyncPress}
          />
        </View>
        <View style={styles.cell}>
          <KpiCard icon="navigate-outline" label="GPS status" value={gpsLabel} />
        </View>
      </View>
      {pendingLocationPoints > 0 ? (
        <ClinicCard compact style={styles.queueBanner}>
          <Ionicons name="trail-sign-outline" size={18} color={c.primary} />
          <Text style={[styles.queueText, { color: c.textSecondary }]}>
            {pendingLocationPoints} route point{pendingLocationPoints === 1 ? "" : "s"} queued for upload
          </Text>
        </ClinicCard>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2, marginBottom: 2 },
  row: { flexDirection: "row", gap: 10 },
  cell: { flex: 1 },
  card: { gap: 6, minHeight: 108, paddingVertical: 14 },
  iconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  value: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 },
  label: { fontSize: 12, fontWeight: "700" },
  hint: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  pressed: { opacity: 0.94 },
  queueBanner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12
  },
  queueText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 }
});
