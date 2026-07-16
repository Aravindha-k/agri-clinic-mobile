import { StyleSheet, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { PrimaryButton } from "../ui";
import { Colors, Spacing } from "../../lib/theme";

type Props = {
  visible: boolean;
  loading?: boolean;
  disabled?: boolean;
  onEnd: () => void;
};

export function WorkdayActionFooter({ visible, loading, disabled, onEnd }: Props) {
  const { t } = useI18n();
  const tabInset = useTabBarBottomInset();

  if (!visible) return null;

  return (
    <View style={[styles.footer, { paddingBottom: tabInset + Spacing.md }]}>
      <PrimaryButton
        label={loading ? t("workdayUx.endingWorkday") : t("workdayUx.endWorkday")}
        onPress={onEnd}
        loading={loading}
        disabled={disabled || loading}
        variant="destructive"
        style={styles.button}
        accessibilityLabel={t("a11y.endWorkday")}
        accessibilityHint={t("a11y.endWorkdayHint")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md
  },
  button: {
    width: "100%"
  }
});
