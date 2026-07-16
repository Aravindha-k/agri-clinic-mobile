import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../../src/i18n/I18nContext";
import { Colors, FontSize, Spacing } from "../../../lib/theme";
import { EmptyState } from "../../ui";

export function DutyNoWorkDayState() {
  const { t } = useI18n();
  return (
    <EmptyState
      icon="calendar-outline"
      title={t("daySummary.idleTitle")}
      subtitle={t("daySummary.idleSubtitle")}
      compact
      style={styles.pad}
    />
  );
}

export function DutyNoVisitsState() {
  const { t } = useI18n();
  return (
    <EmptyState
      icon="clipboard-outline"
      title={t("daySummary.noVisitsYet")}
      compact
      style={styles.pad}
    />
  );
}

export function DutyNoGpsState() {
  const { t } = useI18n();
  return (
    <EmptyState icon="navigate-outline" title={t("workdayUx.turnOnDeviceLocation")} compact style={styles.pad} />
  );
}

export function DutyOfflineState() {
  const { t } = useI18n();
  return <EmptyState icon="cloud-offline-outline" title={t("daySummary.offline")} compact style={styles.pad} />;
}

export function DutyMapEmptyState() {
  const { t } = useI18n();
  return (
    <View style={styles.mapEmpty}>
      <Text style={styles.mapEmptyText}>{t("myLocation.noRouteMapHint")}</Text>
    </View>
  );
}

export function DutyLoadingState({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>{message ?? t("common.loading")}</Text>
    </View>
  );
}

export function DutyErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState icon="alert-circle-outline" title={message} action={onRetry ? "Retry" : undefined} onAction={onRetry} compact style={styles.pad} />
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingVertical: Spacing.lg
  },
  mapEmpty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg
  },
  mapEmptyText: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    textAlign: "center"
  },
  loading: {
    alignItems: "center",
    paddingVertical: Spacing.xl
  },
  loadingText: {
    color: Colors.text3,
    fontSize: FontSize.sm
  }
});
