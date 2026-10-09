import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useI18n } from "../../../../src/i18n/I18nContext";
import type { CategoryCellDef } from "../../../lib/problemCatalog";
import { Colors, FontSize, FontWeight, Radius } from "../../../lib/theme";

type Props = {
  categories: CategoryCellDef[];
  activeCode: string | null;
  onSelect: (code: string | null) => void;
  /** Optional item count per category code. */
  counts?: Record<string, number>;
  totalCount?: number;
};

export function ProblemCategoryChips({ categories, activeCode, onSelect, counts, totalCount }: Props) {
  const { t, language } = useI18n();

  if (!categories.length) return null;

  const allLabel = totalCount != null ? `${t("farmers.all")} · ${totalCount}` : t("farmers.all");

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={() => onSelect(null)}
        accessibilityRole="button"
        accessibilityState={{ selected: !activeCode }}
        hitSlop={{ top: 4, bottom: 4 }}
        style={[styles.chip, !activeCode && styles.chipActive]}
      >
        <Text style={[styles.chipText, !activeCode && styles.chipTextActive]}>{allLabel}</Text>
      </Pressable>
      {categories.map((cell) => {
        const active = activeCode === cell.code;
        const name = language === "ta" ? cell.tamil : cell.english;
        const count = counts?.[cell.code];
        const label = count != null ? `${name} · ${count}` : name;
        return (
          <Pressable
            key={cell.code}
            onPress={() => onSelect(active ? null : cell.code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={{ top: 4, bottom: 4 }}
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
    paddingRight: 4,
    paddingVertical: 2
  },
  chip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14
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
