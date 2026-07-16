import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { formatShortTime } from "../../lib/format";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { DutyTimer } from "./DutyTimer";
import { GpsStatusBadge } from "./GpsStatusBadge";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { PrimaryButton } from "../ui";

type Props = {
  startedAt?: string | null;
  elapsed: string;
  remaining: string;
  expectedEndAt?: string | null;
  visitsToday: number;
  pendingSync: number;
  offline?: boolean;
  gpsEnabled?: boolean;
  permissionDenied?: boolean;
  onOpenDay: () => void;
};

export function ActiveWorkDayCard({
  startedAt,
  elapsed,
  remaining,
  expectedEndAt,
  visitsToday,
  pendingSync,
  offline,
  gpsEnabled,
  permissionDenied,
  onOpenDay
}: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeLabel}>{t("workdayUx.workdayActive")}</Text>
        </View>
        <Text style={styles.startedAt}>
          {startedAt ? t("workdayUx.startedAt", { time: formatShortTime(startedAt) }) : null}
        </Text>
      </View>

      <DutyTimer elapsed={elapsed} compact />

      <View style={styles.metaRow}>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Remaining</Text>
          <Text style={styles.metaValue}>{remaining}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Expected End</Text>
          <Text style={styles.metaValue}>{formatShortTime(expectedEndAt)}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>{t("home.visitsToday")}</Text>
          <Text style={styles.metaValue}>{visitsToday}</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <SyncStatusBadge offline={offline} pendingCount={pendingSync} />
        <GpsStatusBadge gpsEnabled={gpsEnabled} permissionDenied={permissionDenied} />
      </View>

      <PrimaryButton
        label={t("home.openTracking")}
        onPress={onOpenDay}
        style={styles.button}
        accessibilityLabel={t("home.openTracking")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.brand100,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    marginHorizontal: Spacing.screen,
    padding: Spacing.lg
  },
  headerRow: {
    gap: Spacing.xs
  },
  activeBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm
  },
  activeDot: {
    backgroundColor: Colors.green,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  activeLabel: {
    color: Colors.greenText,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  startedAt: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.md
  },
  metaCell: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.inner,
    flex: 1,
    gap: 2,
    padding: Spacing.md
  },
  metaLabel: {
    color: Colors.text3,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  },
  metaValue: {
    color: Colors.text1,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm
  },
  button: {
    width: "100%"
  }
});
