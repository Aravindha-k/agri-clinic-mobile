import { StyleSheet, Text, View } from "react-native";
import { useResponsiveLayout } from "../../../src/hooks/useResponsiveLayout";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { TODAY_CARD_GAP, TODAY_PAGE_PAD } from "../../lib/todayLayout";

type Props = {
  visitsToday: number;
  farmersCovered: number;
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

/** Compact visits / farmers — distance is not shown. */
export function TodayEssentialsRow({ visitsToday, farmersCovered }: Props) {
  const { contentMaxWidth, narrow } = useResponsiveLayout();

  return (
    <View style={[styles.row, contentMaxWidth, narrow && styles.rowNarrow]}>
      <Cell label="Visits today" value={String(Math.max(0, visitsToday))} />
      <Cell label="Farmers covered" value={String(Math.max(0, farmersCovered))} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: TODAY_CARD_GAP,
    paddingHorizontal: TODAY_PAGE_PAD
  },
  rowNarrow: {
    flexWrap: "wrap"
  },
  cell: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexBasis: "45%",
    gap: 2,
    minWidth: 120,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md
  },
  value: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  label: {
    color: Colors.text3,
    fontSize: 11,
    fontWeight: FontWeight.medium
  }
});
