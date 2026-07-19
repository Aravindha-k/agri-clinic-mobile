import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  trackingStatus: string;
  gpsPoints: number;
  lastLocationLabel: string;
  nextSyncLabel: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function DayRouteSummary({ trackingStatus, gpsPoints, lastLocationLabel, nextSyncLabel }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Route summary</Text>
      <Row label="Tracking status" value={trackingStatus} />
      <Row label="GPS points" value={String(gpsPoints)} />
      <Row label="Last recorded location" value={lastLocationLabel} />
      <Row label="Next sync" value={nextSyncLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.md
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md
  },
  label: {
    color: Colors.text3,
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  value: {
    color: Colors.text1,
    flex: 1.2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textAlign: "right"
  }
});
