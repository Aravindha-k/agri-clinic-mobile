import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Visit } from "../../api/visits";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { getVisitDisplayDateTime } from "../../utils/format";
import { cropLabelFromVisit } from "../../utils/farmerPrefill";

type Props = {
  visit: Visit;
  onPress?: () => void;
};

export function FarmerVisitHistoryCard({ visit, onPress }: Props) {
  const { colors, type, shadows } = useDesignSystem();
  const crop = cropLabelFromVisit(visit) || "Crop not recorded";
  const problem = visit.problem_seen || visit.problem_description || visit.field_notes || visit.observation;
  const advice = visit.action_taken || visit.recommendation;

  const inner = (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.cardTitle}>{crop}</Text>
          <Text style={type.caption}>{getVisitDisplayDateTime(visit)}</Text>
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
      </View>
      {problem ? <Text style={[type.meta, { color: colors.textSecondary, marginTop: 8 }]} numberOfLines={2}>{problem}</Text> : null}
      {advice ? (
        <View style={[styles.advice, { backgroundColor: colors.successSoft }]}>
          <Text style={[type.caption, { color: colors.success }]} numberOfLines={2}>
            {advice}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.94 }}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  head: { alignItems: "center", flexDirection: "row", gap: 10 },
  icon: { alignItems: "center", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  advice: { borderRadius: 10, marginTop: 10, paddingHorizontal: 10, paddingVertical: 8 }
});
