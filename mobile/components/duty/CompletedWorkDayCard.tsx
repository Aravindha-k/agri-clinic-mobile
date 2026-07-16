import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { formatShortTime } from "../../lib/format";
import { DutyTimer } from "./DutyTimer";

type Props = {
  elapsed: string;
  startedAt?: string | null;
  endedAt?: string | null;
  autoCompleted?: boolean;
};

export function CompletedWorkDayCard({ elapsed, startedAt, endedAt, autoCompleted }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {autoCompleted ? "Auto Completed" : t("workdayUx.statusCompleted")}
        </Text>
      </View>
      <DutyTimer elapsed={elapsed} compact />
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Started {formatShortTime(startedAt)}</Text>
        <Text style={styles.meta}>Ended {formatShortTime(endedAt)}</Text>
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
    marginHorizontal: Spacing.screen,
    padding: Spacing.lg
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  badgeText: {
    color: Colors.brand700,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold
  },
  metaRow: {
    gap: 4
  },
  meta: {
    color: Colors.text3,
    fontSize: FontSize.sm
  }
});
