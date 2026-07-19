import { StyleSheet, Text, View } from "react-native";
import { formatShortTime } from "../../lib/format";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { formatGpsStatusLabel } from "../today/formatDistanceTravelled";

type Props = {
  statusLabel: string;
  startedAt?: string | null;
  expectedEndAt?: string | null;
  visitsCompleted: number;
  farmersCovered: number;
  dutyActive?: boolean;
  gpsEnabled?: boolean;
  permissionDenied?: boolean;
  /** Denser layout for short phones — frees vertical space for the map. */
  compact?: boolean;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.cellLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Compact day summary — no distance, end controls, battery, sync tech, or timelines. */
export function DayCompactSummary({
  statusLabel,
  startedAt,
  expectedEndAt,
  visitsCompleted,
  farmersCovered,
  dutyActive,
  gpsEnabled,
  permissionDenied,
  compact = false
}: Props) {
  const gps = formatGpsStatusLabel({
    gpsEnabled,
    permissionDenied,
    dutyActive
  });

  if (compact) {
    return (
      <View style={styles.cardCompact}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            Day overview
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.timeLine} numberOfLines={1}>
          {formatShortTime(startedAt)} → {formatShortTime(expectedEndAt)} · GPS {gps}
        </Text>
        <View style={styles.grid}>
          <Cell label="Visits" value={String(Math.max(0, visitsCompleted))} />
          <Cell label="Farmers" value={String(Math.max(0, farmersCovered))} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Day overview</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>
      <Row label="Started" value={formatShortTime(startedAt)} />
      <Row label="Expected end" value={formatShortTime(expectedEndAt)} />
      <Row label="Visits completed" value={String(Math.max(0, visitsCompleted))} />
      <Row label="Farmers covered" value={String(Math.max(0, farmersCovered))} />
      <Row label="GPS" value={gps} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 3,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm
  },
  cardCompact: {
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm
  },
  title: {
    color: Colors.text1,
    flexShrink: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  statusPill: {
    backgroundColor: Colors.brand50,
    borderRadius: Radius.pill,
    flexShrink: 0,
    maxWidth: "48%",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  statusText: {
    color: Colors.brand700,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold
  },
  timeLine: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium
  },
  grid: {
    flexDirection: "row",
    gap: Spacing.sm
  },
  cell: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.inner,
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm
  },
  cellValue: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  cellLabel: {
    color: Colors.text3,
    fontSize: 11,
    fontWeight: FontWeight.medium
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1
  },
  label: {
    color: Colors.text3,
    flexShrink: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  value: {
    color: Colors.text1,
    flexShrink: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.md,
    textAlign: "right"
  }
});
