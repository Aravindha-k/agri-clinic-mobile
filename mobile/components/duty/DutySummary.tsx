import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  visitsToday: number;
  completed: number;
  pendingSync: number;
  queued: number;
  failed: number;
};

function SummaryCell({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.value, warn && styles.valueWarn]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function DutySummary({ visitsToday, completed, pendingSync, queued, failed }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("daySummary.visitsCompleted")}</Text>
      <View style={styles.row}>
        <SummaryCell label="Today" value={visitsToday} />
        <SummaryCell label="Completed" value={completed} />
        <SummaryCell label="Pending Sync" value={pendingSync} warn={pendingSync > 0} />
        <SummaryCell label="Queued" value={queued} warn={queued > 0} />
        <SummaryCell label="Failed" value={failed} warn={failed > 0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm
  },
  cell: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.inner,
    flexBasis: "30%",
    flexGrow: 1,
    gap: 2,
    minWidth: 88,
    padding: Spacing.md
  },
  value: {
    color: Colors.text1,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold
  },
  valueWarn: {
    color: Colors.amberText
  },
  label: {
    color: Colors.text3,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  }
});
