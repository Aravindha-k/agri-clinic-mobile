import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Colors, FontSize, FontWeight, Spacing, TextStyles } from "../../lib/theme";

type Props = {
  elapsed: string;
  compact?: boolean;
};

export function DutyTimer({ elapsed, compact }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.elapsed, compact && styles.elapsedCompact]} accessibilityLabel={elapsed}>
        {elapsed}
      </Text>
      <Text style={styles.caption}>{t("workdayUx.todaysWorkTime")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.xs
  },
  elapsed: {
    color: Colors.text1,
    fontSize: 40,
    fontWeight: FontWeight.bold,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"]
  },
  elapsedCompact: {
    fontSize: 32
  },
  caption: {
    ...TextStyles.caption,
    color: Colors.text3,
    marginTop: -2
  }
});
