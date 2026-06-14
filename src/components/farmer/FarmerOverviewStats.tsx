import { StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { KpiCard } from "../ui/KpiCard";

type Props = {
  totalVisits: number;
  lastVisitLabel: string;
  fieldsCount: number;
  openIssues: number;
  onVisitsPress?: () => void;
};

export function FarmerOverviewStats({
  totalVisits,
  lastVisitLabel,
  fieldsCount,
  openIssues,
  onVisitsPress
}: Props) {
  const { type } = useDesignSystem();

  return (
    <View style={styles.wrap}>
      <Text style={type.sectionTitle}>Overview</Text>
      <View style={styles.row}>
        <View style={styles.cell}>
          <KpiCard icon="clipboard-outline" label="Total visits" value={totalVisits} onPress={onVisitsPress} accent={totalVisits > 0} />
        </View>
        <View style={styles.cell}>
          <KpiCard icon="calendar-outline" label="Last visit" value={lastVisitLabel} hint="Most recent field visit" />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <KpiCard icon="map-outline" label="Fields" value={fieldsCount} hint="Registered plots" />
        </View>
        <View style={styles.cell}>
          <KpiCard
            icon="alert-circle-outline"
            label="Open issues"
            value={openIssues}
            hint={openIssues ? "Needs follow-up" : "All clear"}
            accent={openIssues > 0}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  cell: { flex: 1 }
});
