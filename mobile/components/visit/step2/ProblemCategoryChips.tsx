import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useI18n } from "../../../../src/i18n/I18nContext";
import type { CategoryCellDef } from "../../../lib/problemCatalog";
import { Colors, FontSize, FontWeight, Radius } from "../../../lib/theme";

type Props = {
  categories: CategoryCellDef[];
  activeCode: string | null;
  onSelect: (code: string | null) => void;
};

export function ProblemCategoryChips({ categories, activeCode, onSelect }: Props) {
  const { t, language } = useI18n();

  if (!categories.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.chip, !activeCode && styles.chipActive]}
      >
        <Text style={[styles.chipText, !activeCode && styles.chipTextActive]}>{t("farmers.all")}</Text>
      </Pressable>
      {categories.map((cell) => {
        const active = activeCode === cell.code;
        const label = language === "ta" ? cell.tamil : cell.english;
        return (
          <Pressable
            key={cell.code}
            onPress={() => onSelect(active ? null : cell.code)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingRight: 4
  },
  chip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  chipActive: {
    backgroundColor: Colors.brand700,
    borderColor: Colors.brand700
  },
  chipText: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  chipTextActive: {
    color: Colors.surface
  }
});
