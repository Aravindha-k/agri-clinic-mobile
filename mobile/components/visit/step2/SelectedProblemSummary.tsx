import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ProblemItem } from "../../../../src/api/problems";
import { useI18n } from "../../../../src/i18n/I18nContext";
import { formatCategoryBadgeLocalized } from "../../../lib/problemCatalog";
import { Colors, FontSize, FontWeight, Radius } from "../../../lib/theme";

type Props = {
  problem: ProblemItem;
  onChange: () => void;
};

export function SelectedProblemSummary({ problem, onChange }: Props) {
  const { t, language } = useI18n();
  const categoryLabel = formatCategoryBadgeLocalized(problem.category, undefined, language);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.label}>{t("visitFlow.selectedProblem")}</Text>
        <Pressable onPress={onChange} hitSlop={8}>
          <Text style={styles.changeLink}>{t("visitFlow.change")}</Text>
        </Pressable>
      </View>
      <Text style={styles.tamil} numberOfLines={2}>
        {problem.tamil_name?.trim() || problem.name}
      </Text>
      {problem.tamil_name?.trim() ? (
        <Text style={styles.english} numberOfLines={1}>
          {problem.name}
        </Text>
      ) : null}
      {categoryLabel ? (
        <Text style={styles.meta}>
          {t("visitFlow.category")}: {categoryLabel}
        </Text>
      ) : null}
      <View style={styles.checkRow}>
        <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
        <Text style={styles.checkText}>{t("visitFlow.readyToContinue")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: 4,
    padding: 14
  },
  head: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: Colors.greenText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  changeLink: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  tamil: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  english: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  meta: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    marginTop: 2
  },
  checkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4
  },
  checkText: {
    color: Colors.greenText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  }
});
