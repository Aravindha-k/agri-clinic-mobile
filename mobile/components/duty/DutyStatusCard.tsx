import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import type { DutySessionStatus } from "../../../src/features/duty/types/duty";
import { formatShortTime } from "../../lib/format";
import { Colors, FontSize, FontWeight, Radius, Spacing, TextStyles } from "../../lib/theme";
import { DutyTimer } from "./DutyTimer";
import { GpsStatusBadge } from "./GpsStatusBadge";
import { SyncStatusBadge } from "./SyncStatusBadge";

type Props = {
  status: DutySessionStatus;
  startedAt?: string | null;
  expectedEndAt?: string | null;
  elapsed: string;
  remaining: string;
  offline?: boolean;
  pendingSync?: number;
  syncing?: boolean;
  gpsEnabled?: boolean;
  permissionDenied?: boolean;
  sticky?: boolean;
};

function statusMeta(status: DutySessionStatus, t: (key: string) => string) {
  switch (status) {
    case "active":
      return { label: t("workdayUx.statusWorking"), color: Colors.greenText, bg: Colors.greenBg };
    case "auto_completed":
      return { label: "Auto Completed", color: Colors.amberText, bg: Colors.amberBg };
    case "completed":
      return { label: t("workdayUx.statusCompleted"), color: Colors.brand700, bg: Colors.brand50 };
    default:
      return { label: t("workdayUx.statusNotStarted"), color: Colors.text3, bg: Colors.bg };
  }
}

export function DutyStatusCard({
  status,
  startedAt,
  expectedEndAt,
  elapsed,
  remaining,
  offline,
  pendingSync,
  syncing,
  gpsEnabled,
  permissionDenied,
  sticky
}: Props) {
  const { t } = useI18n();
  const meta = statusMeta(status, t);

  return (
    <View style={[styles.card, sticky && styles.sticky]}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>{t("workdayUx.status")}</Text>
        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Started</Text>
          <Text style={styles.metaValue}>{formatShortTime(startedAt)}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Expected End</Text>
          <Text style={styles.metaValue}>{formatShortTime(expectedEndAt)}</Text>
        </View>
      </View>

      <DutyTimer elapsed={elapsed} />
      <View style={styles.remainingBlock}>
        <Text style={styles.remainingCaption}>Remaining</Text>
        <Text style={styles.remainingTimer}>{remaining}</Text>
      </View>

      <View style={styles.badgeRow}>
        <SyncStatusBadge offline={offline} pendingCount={pendingSync} syncing={syncing} />
        <GpsStatusBadge gpsEnabled={gpsEnabled} permissionDenied={permissionDenied} />
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
    padding: Spacing.lg
  },
  sticky: {
    marginTop: Spacing.md,
    zIndex: 2
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionLabel: {
    ...TextStyles.caption,
    color: Colors.text3,
    fontWeight: FontWeight.semibold
  },
  statusPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  statusPillText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold
  },
  metaGrid: {
    flexDirection: "row",
    gap: Spacing.md
  },
  metaCell: {
    flex: 1,
    gap: 2
  },
  metaLabel: {
    color: Colors.text3,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  },
  metaValue: {
    color: Colors.text1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  },
  remainingBlock: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: Radius.inner,
    gap: 2,
    paddingVertical: Spacing.sm
  },
  remainingCaption: {
    color: Colors.text3,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  },
  remainingTimer: {
    color: Colors.text1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    fontVariant: ["tabular-nums"]
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm
  }
});
