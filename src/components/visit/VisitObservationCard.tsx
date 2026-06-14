import { StyleSheet, Text, View } from "react-native";
import type { Visit } from "../../api/visits";
import { formatCategoryDisplay } from "../../api/problems";
import { PremiumCard } from "../ui";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { displayVisitField } from "../../utils/visitFieldNotes";
import { resolveVisitFarmer } from "../../utils/visitFarmer";

type Props = {
  visit: Visit;
};

function DetailRow({ label, value, tamil }: { label: string; value: string; tamil?: string }) {
  const { colors, type } = useDesignSystem();
  const muted = value === "Not added by employee";
  return (
    <View style={styles.row}>
      <Text style={[type.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: muted ? colors.muted : colors.text }]}>{value}</Text>
      {tamil ? <Text style={[type.meta, { color: colors.textSecondary, marginTop: 2 }]}>{tamil}</Text> : null}
    </View>
  );
}

export function VisitObservationCard({ visit }: Props) {
  const { colors, type } = useDesignSystem();
  const farmer = resolveVisitFarmer(visit);
  const cropLabel = visit.crop_name || farmer.cropName;
  const observation = visit.field_notes || visit.observation || visit.recommendation || visit.general_advice;
  const followUp = visit.follow_up_date || visit.next_visit_date;
  const fv = visit.field_visit;
  const categoryName =
    fv?.problem_category?.name ||
    formatCategoryDisplay(fv?.problem_category?.code, fv?.problem_category?.name);
  const master = fv?.problem_master || fv?.problem_subcategory;
  const masterTamil = master && "tamil_name" in master ? (master.tamil_name as string | undefined) : undefined;

  return (
    <PremiumCard elevated tint="soft">
      <Text style={[type.sectionTitle, { marginBottom: 12 }]}>Field record</Text>
      <DetailRow label="Crop" value={displayVisitField(cropLabel !== "—" ? cropLabel : undefined)} />
      {categoryName ? <DetailRow label="Problem category" value={categoryName} /> : null}
      {master?.name ? (
        <DetailRow label="Problem item" value={master.name} tamil={masterTamil || undefined} />
      ) : (
        <DetailRow label="Problem seen" value={displayVisitField(visit.problem_seen || visit.problem_description)} />
      )}
      <DetailRow label="Observation / field notes" value={displayVisitField(observation)} />
      <DetailRow label="Action taken" value={displayVisitField(visit.action_taken)} />
      <DetailRow label="Follow-up date" value={followUp ? String(followUp) : displayVisitField(undefined)} />
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 14 },
  value: { fontSize: 16, fontWeight: "700", lineHeight: 22, marginTop: 4 }
});
