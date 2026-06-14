import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { FarmerTimelineEvent } from "../../utils/farmerTimeline";
import { useDesignSystem } from "../../hooks/useDesignSystem";

const TONE: Record<FarmerTimelineEvent["type"], { soft: string; fg: string }> = {
  visit: { soft: "successSoft", fg: "success" },
  recommendation: { soft: "primarySoft", fg: "primaryDark" },
  issue: { soft: "warningSoft", fg: "warning" },
  activity: { soft: "cardMuted", fg: "textSecondary" }
};

type Props = {
  event: FarmerTimelineEvent;
  isLast?: boolean;
};

export function FarmerTimelineCard({ event, isLast }: Props) {
  const { colors, type } = useDesignSystem();
  const toneKey = TONE[event.type];
  const bg = colors[toneKey.soft as keyof typeof colors] as string;
  const fg = colors[toneKey.fg as keyof typeof colors] as string;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: bg, borderColor: fg }]}>
          <Ionicons name={event.icon} size={14} color={fg} />
        </View>
        {!isLast ? <View style={[styles.line, { backgroundColor: colors.borderSubtle }]} /> : null}
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Text style={[type.caption, { color: colors.muted }]}>{event.dateLabel}</Text>
        <Text style={[type.bodyStrong, { color: colors.text, marginTop: 2 }]}>{event.title}</Text>
        {event.subtitle ? (
          <Text style={[type.meta, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={3}>
            {event.subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  rail: { alignItems: "center", width: 28 },
  dot: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  line: { flex: 1, marginVertical: 4, width: 2 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    marginBottom: 12,
    padding: 12
  }
});
