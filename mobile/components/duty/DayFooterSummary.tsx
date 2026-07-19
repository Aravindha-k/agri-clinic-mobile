import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  totalFarmers: number;
  completedVisits: number;
  remainingVisits: number;
  distanceLabel: string;
  workingTime: string;
  offlineItems: number;
};

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function DayFooterSummary({
  totalFarmers,
  completedVisits,
  remainingVisits,
  distanceLabel,
  workingTime,
  offlineItems
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Day summary</Text>
      <View style={styles.grid}>
        <Cell label="Total farmers" value={String(totalFarmers)} />
        <Cell label="Completed" value={String(completedVisits)} />
        <Cell label="Remaining" value={String(remainingVisits)} />
        <Cell label="Distance" value={distanceLabel} />
        <Cell label="Working time" value={workingTime} />
        <Cell label="Offline items" value={String(offlineItems)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.md
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm
  },
  cell: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.inner,
    flexBasis: "30%",
    flexGrow: 1,
    gap: 2,
    minWidth: 96,
    padding: Spacing.sm
  },
  value: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  label: {
    color: Colors.text3,
    fontSize: 11,
    fontWeight: FontWeight.medium
  }
});
