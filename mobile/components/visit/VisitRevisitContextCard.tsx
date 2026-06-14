import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import type { RevisitContext } from "../../store/visitFormStore";
import { Colors, FontSize, FontWeight, Radius } from "../../lib/theme";

type Props = {
  context: RevisitContext;
};

export function VisitRevisitContextCard({ context }: Props) {
  const { t } = useI18n();
  const lines = [
    context.cropLabel ? { label: t("visitFlow.previousCrop"), value: context.cropLabel } : null,
    context.problemLabel ? { label: t("visitFlow.previousProblem"), value: context.problemLabel } : null,
    context.recommendationLabel
      ? { label: t("visitFlow.previousRecommendation"), value: context.recommendationLabel }
      : null
  ].filter(Boolean) as { label: string; value: string }[];

  if (!lines.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t("visitFlow.revisitContext")}</Text>
      {lines.map((line) => (
        <View key={line.label} style={styles.row}>
          <Text style={styles.label}>{line.label}</Text>
          <Text style={styles.value} numberOfLines={3}>
            {line.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.amberBg,
    borderColor: Colors.amber,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  heading: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  row: {
    gap: 2
  },
  label: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  value: {
    color: Colors.text1,
    fontSize: FontSize.md
  }
});
