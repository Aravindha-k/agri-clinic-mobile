import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { PrimaryButton } from "../ui";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing, TextStyles } from "../../lib/theme";
import { GpsStatusBadge } from "./GpsStatusBadge";
import { SyncStatusBadge } from "./SyncStatusBadge";

type Props = {
  loading?: boolean;
  starting?: boolean;
  startingLabel?: string | null;
  /** Idle-state label override (Try Again / Open Settings). */
  buttonLabel?: string | null;
  error?: string | null;
  onStart: () => void;
  onDismissError?: () => void;
  offline?: boolean;
  pendingSync?: number;
  gpsEnabled?: boolean;
  permissionDenied?: boolean;
};

export function StartWorkDayCard({
  loading,
  starting,
  startingLabel,
  buttonLabel,
  error,
  onStart,
  offline,
  pendingSync,
  gpsEnabled,
  permissionDenied
}: Props) {
  const { t } = useI18n();
  const busy = loading || starting;
  const label = busy
    ? startingLabel || t("workdayUx.startingWorkday")
    : buttonLabel || t("workdayUx.startWorkday");

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("workdayUx.startYourWorkday")}</Text>
      <Text style={styles.helper}>{t("workdayUx.startHelper")}</Text>

      <View style={styles.badgeRow}>
        <GpsStatusBadge gpsEnabled={gpsEnabled} permissionDenied={permissionDenied} />
        <SyncStatusBadge offline={offline} pendingCount={pendingSync} />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>{t("workdayUx.couldNotStart")}</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : null}

      <PrimaryButton
        label={label}
        onPress={onStart}
        loading={busy}
        disabled={busy}
        style={styles.button}
        accessibilityLabel={t("a11y.startWorkday")}
        accessibilityHint={t("a11y.startWorkdayHint")}
      />
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
    padding: Spacing.lg,
    ...Shadow.cardRaised
  },
  title: {
    ...TextStyles.h2,
    color: Colors.text1
  },
  helper: {
    ...TextStyles.body,
    color: Colors.text3
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm
  },
  errorBanner: {
    backgroundColor: Colors.redBg,
    borderColor: Colors.red,
    borderRadius: Radius.inner,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    padding: Spacing.md
  },
  errorTitle: {
    color: Colors.redText,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  },
  errorBody: {
    color: Colors.redText,
    fontSize: FontSize.caption
  },
  button: {
    width: "100%"
  }
});
