import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ProblemItem } from "../../../../src/api/problems";
import { useI18n } from "../../../../src/i18n/I18nContext";
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
  const english = item.name?.trim() || "";
  const tamil = item.tamil_name?.trim() || "";
  const primary = language === "ta" ? tamil || english : english || tamil;
  const secondary = language === "ta" ? (tamil ? english : "") : english ? tamil : "";
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
      accessibilityLabel={[primary, secondary, categoryLabel].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.cardPressed]}
    >
      <View style={styles.body}>
        <Text style={styles.primary} numberOfLines={3}>
          {primary}
        </Text>
        {secondary && secondary !== primary ? (
          <Text style={styles.secondary} numberOfLines={2}>
            {secondary}
          </Text>
        ) : null}
        {categoryLabel ? (
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.fg }]}>{categoryLabel}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons
        name={selected ? "checkbox" : "square-outline"}
        size={24}
        color={selected ? Colors.green : Colors.text4}
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
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  cardSelected: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
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
    fontWeight: FontWeight.semibold
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
