import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from "../../../mobile/lib/theme";

export const MyLocationMapLegend = memo(function MyLocationMapLegend() {
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <LegendRow color="#D97706" label={t("myLocation.legendRouteStart")} variant="dot" />
      <LegendRow color={Colors.green} label={t("myLocation.legendVisit")} variant="dot" />
    </View>
  );
});

function LegendRow({
  color,
  label,
  variant
}: {
  color: string;
  label: string;
  variant: "arrow" | "check" | "line" | "dot";
}) {
  return (
    <View style={styles.row}>
      {variant === "line" ? (
        <View style={[styles.lineSwatch, { backgroundColor: color }]} />
      ) : (
        <View style={[styles.dotSwatch, { backgroundColor: color }]}>
          {variant === "check" ? <Text style={styles.check}>✓</Text> : null}
        </View>
      )}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: Radius.md,
    gap: 6,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    position: "absolute",
    bottom: Spacing.md,
    ...Shadow.card
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  dotSwatch: {
    alignItems: "center",
    borderRadius: 8,
    height: 16,
    justifyContent: "center",
    width: 16
  },
  lineSwatch: {
    borderRadius: 2,
    height: 4,
    width: 16
  },
  check: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: FontWeight.bold,
    lineHeight: 12
  },
  label: {
    color: Colors.text2,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium
  }
});
