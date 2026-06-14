import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ProblemCategory } from "../../api/problems";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { categoryVisualForCode } from "../../utils/problemCategoryVisual";

type Props = {
  categories: ProblemCategory[];
  activeCategoryId?: string;
  activeCategoryCode?: string;
  customProblem?: boolean;
  onSelect: (category: ProblemCategory) => void;
  onCustomProblem: () => void;
};

const TINT_COLORS = {
  pest: { soft: "#E8F5E9", accent: "#2E7D32" },
  disease: { soft: "#FCE4EC", accent: "#C62828" },
  nutrient: { soft: "#FFF8E1", accent: "#F9A825" },
  other: { soft: "#ECEFF1", accent: "#546E7A" }
} as const;

export function ProblemCategoryGrid({
  categories,
  activeCategoryId,
  activeCategoryCode,
  customProblem,
  onSelect,
  onCustomProblem
}: Props) {
  const { colors, type, shadows } = useDesignSystem();

  return (
    <View style={styles.grid}>
      {categories.map((category) => {
        const visual = categoryVisualForCode(category.code, category.name);
        const tint = TINT_COLORS[visual.tint];
        const active =
          !customProblem &&
          (String(category.id) === activeCategoryId || category.code === activeCategoryCode);

        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            onPress={() => onSelect(category)}
            style={({ pressed }) => [styles.cell, pressed && { opacity: 0.94 }]}
          >
            <View
              style={[
                styles.card,
                {
                  backgroundColor: active ? colors.primarySoft : colors.card,
                  borderColor: active ? colors.primary : colors.borderSubtle
                },
                shadows.card
              ]}
            >
              <View style={[styles.emojiWrap, { backgroundColor: tint.soft }]}>
                <Text style={styles.emoji}>{visual.emoji}</Text>
              </View>
              <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
                {category.name}
              </Text>
              {active ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.check} /> : null}
            </View>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        onPress={onCustomProblem}
        style={({ pressed }) => [styles.cell, pressed && { opacity: 0.94 }]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: customProblem ? colors.warningSoft : colors.card,
              borderColor: customProblem ? colors.warning : colors.borderSubtle
            },
            shadows.card
          ]}
        >
          <View style={[styles.emojiWrap, { backgroundColor: colors.cardMuted }]}>
            <Ionicons name="create-outline" size={24} color={colors.muted} />
          </View>
          <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
            Describe manually
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: { width: "47%" },
  card: {
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 108,
    padding: 14,
    position: "relative"
  },
  emojiWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  emoji: { fontSize: 26 },
  check: { position: "absolute", right: 10, top: 10 }
});
