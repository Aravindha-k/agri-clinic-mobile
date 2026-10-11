import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ProblemItem } from "../../../../src/api/problems";
import { useI18n } from "../../../../src/i18n/I18nContext";
import { bilingualLabel } from "../../../../src/utils/bilingualName";
import { categoryCodeFromValue } from "../../../../src/utils/problemItemFilter";
import { formatCategoryBadgeLocalized } from "../../../lib/problemCatalog";
import { Colors, FontSize, FontWeight, Radius } from "../../../lib/theme";

type Props = {
  item: ProblemItem;
  selected: boolean;
  onPress: () => void;
  /** Show the category badge (useful when the list is not grouped by category). */
  showCategory?: boolean;
};

function badgeTone(code: string) {
  if (code === "pest") return { bg: Colors.amberBg, fg: Colors.amberText };
  if (code === "disease") return { bg: Colors.redBg, fg: Colors.redText };
  return { bg: Colors.blueBg, fg: Colors.blueText };
}

export function ProblemSelectCard({ item, selected, onPress, showCategory = false }: Props) {
  const { language } = useI18n();
  const label = bilingualLabel(item.name, item.tamil_name);
  const code = categoryCodeFromValue(item.category) || (item.category_code ?? "").toLowerCase();
  const categoryLabel = showCategory
    ? formatCategoryBadgeLocalized(code, item.category_name, language)
    : "";
  const tone = badgeTone(code);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[label, categoryLabel].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.cardPressed]}
    >
      <View style={styles.body}>
        <Text style={styles.primary} numberOfLines={3}>
          {label}
        </Text>
        {categoryLabel ? (
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.fg }]}>{categoryLabel}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={24}
        color={selected ? Colors.brand700 : Colors.text4}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  cardSelected: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.brand700,
    borderWidth: 1.5
  },
  cardPressed: {
    opacity: 0.92
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  primary: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.1
  },
  secondary: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  badgeText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold
  }
});
