import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatCategoryDisplay } from "../../api/problems";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  name: string;
  tamilName?: string | null;
  categoryCode?: string;
  categoryName?: string | null;
  cropName?: string | null;
  selected?: boolean;
  onPress: () => void;
};

export function ProblemCard({
  name,
  tamilName,
  categoryCode,
  categoryName,
  cropName,
  selected,
  onPress
}: Props) {
  const { colors, type, layout } = useDesignSystem();
  const category = formatCategoryDisplay(categoryCode, categoryName);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? colors.primarySoft : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          minHeight: layout.buttonMinHeight + 20,
          opacity: pressed ? 0.94 : 1
        }
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="leaf-outline" size={22} color={colors.primaryDark} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {name}
        </Text>
        {tamilName ? (
          <Text style={[type.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {tamilName}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {category ? (
            <View style={[styles.badge, { backgroundColor: colors.cardMuted }]}>
              <Text style={[styles.badgeText, { color: colors.primaryDark }]}>{category}</Text>
            </View>
          ) : null}
          {cropName ? (
            <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
              {cropName}
            </Text>
          ) : null}
        </View>
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  body: { flex: 1, gap: 4, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "800", lineHeight: 22 },
  metaRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgeText: { fontSize: 11, fontWeight: "800" }
});
