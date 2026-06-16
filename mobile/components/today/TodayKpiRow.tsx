import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";

type Kpi = {
  key: string;
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
};

type Props = {
  items: Kpi[];
};

export function TodayKpiRow({ items }: Props) {
  return (
    <View style={styles.wrap}>
      <FlatCard style={styles.card}>
        <View style={styles.row}>
          {items.map((item, index) => (
            <View key={item.key} style={[styles.cell, index > 0 && styles.cellBorder]}>
              <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={16} color={item.tint} />
              </View>
              <Text style={styles.value}>{item.value}</Text>
              <Text style={styles.label} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </FlatCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg
  },
  card: {
    padding: Spacing.md
  },
  row: {
    flexDirection: "row"
  },
  cell: {
    alignItems: "center",
    flex: 1,
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4
  },
  cellBorder: {
    borderLeftColor: Colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: Radius.chip,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  value: {
    color: Colors.text1,
    fontSize: FontSize.stat,
    fontVariant: ["tabular-nums"],
    fontWeight: FontWeight.bold,
    lineHeight: 32
  },
  label: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textAlign: "center"
  }
});
