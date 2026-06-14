import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatCategoryDisplay } from "../../api/problems";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  categoryCode?: string;
  categoryName?: string;
  name: string;
  tamilName?: string | null;
  cropName?: string | null;
  onClear?: () => void;
};

export function SelectedProblemItemCard({
  categoryCode,
  categoryName,
  name,
  tamilName,
  cropName,
  onClear
}: Props) {
  const { colors, type } = useDesignSystem();
  const category = formatCategoryDisplay(categoryCode, categoryName);

  return (
    <View style={[styles.card, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
      <View style={styles.top}>
        <View style={[styles.badge, { backgroundColor: colors.card }]}>
          <Text style={[type.label, { color: colors.primaryDark }]}>{category || "Problem"}</Text>
        </View>
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear problem">
            <Ionicons name="close-circle" size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
      {tamilName ? <Text style={[styles.tamil, { color: colors.textSecondary }]}>{tamilName}</Text> : null}
      {cropName ? (
        <Text style={[type.caption, { color: colors.muted, marginTop: 4 }]}>Crop: {cropName}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 14
  },
  top: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  name: { fontSize: 17, fontWeight: "800", lineHeight: 24 },
  tamil: { fontSize: 15, fontWeight: "600", lineHeight: 22 }
});
