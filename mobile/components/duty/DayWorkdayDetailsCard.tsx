import { StyleSheet, Text, View } from "react-native";
import type { DutySessionStatus } from "../../../src/features/duty/types/duty";
import { formatShortTime } from "../../lib/format";
import { Colors, FontSize, FontWeight, Radius, Spacing, TextStyles } from "../../lib/theme";
import { GpsStatusBadge } from "./GpsStatusBadge";

type Props = {
  status: DutySessionStatus;
  startedAt?: string | null;
  expectedEndAt?: string | null;
  endedAt?: string | null;
  distanceLabel: string;
  visitsToday: number;
  gpsEnabled?: boolean;
  permissionDenied?: boolean;
};

function statusMeta(status: DutySessionStatus) {
  switch (status) {
    case "active":
      return { label: "Active", color: Colors.greenText, bg: Colors.greenBg };
    case "auto_completed":
      return { label: "Auto Completed", color: Colors.amberText, bg: Colors.amberBg };
    case "completed":
      return { label: "Completed", color: Colors.brand700, bg: Colors.brand50 };
    default:
      return { label: "Not started", color: Colors.text3, bg: Colors.bg };
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** Legacy details card — no employee end-workday control. Prefer DayCompactSummary. */
export function DayWorkdayDetailsCard({
  status,
  startedAt,
  expectedEndAt,
  endedAt,
  distanceLabel,
  visitsToday,
  gpsEnabled,
  permissionDenied
}: Props) {
  const meta = statusMeta(status);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Workday details</Text>
        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <DetailRow label="Started time" value={formatShortTime(startedAt)} />
      <DetailRow
        label="Expected end"
        value={endedAt ? formatShortTime(endedAt) : formatShortTime(expectedEndAt)}
      />
      <DetailRow label="Distance travelled" value={distanceLabel} />
      <DetailRow label="Today's visits" value={String(visitsToday)} />

      <View style={styles.badgeRow}>
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
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs
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
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2
  },
  detailLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  detailValue: {
    color: Colors.text1,
    flexShrink: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.md,
    textAlign: "right"
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs
  }
});
