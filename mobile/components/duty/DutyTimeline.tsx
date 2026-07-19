import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import type { DutyMapVisitMarker } from "../../../src/features/duty/types/duty";
import { formatShortTime } from "../../lib/format";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  startedAt?: string | null;
  endedAt?: string | null;
  visits: DutyMapVisitMarker[];
  syncEvents?: Array<{ title: string; at?: string | null }>;
};

function TimelineNode({
  title,
  subtitle,
  tone = "default"
}: {
  title: string;
  subtitle?: string | null;
  tone?: "default" | "active" | "muted";
}) {
  const dotStyle =
    tone === "active" ? styles.dotActive : tone === "muted" ? styles.dotMuted : styles.dotDefault;
  return (
    <View style={styles.node}>
      <View style={[styles.dot, dotStyle]} />
      <View style={styles.nodeCopy}>
        <Text style={styles.nodeTitle}>{title}</Text>
        {subtitle ? <Text style={styles.nodeSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function DutyTimeline({ startedAt, endedAt, visits, syncEvents = [] }: Props) {
  const { t } = useI18n();
  const sorted = [...visits].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Workday timeline</Text>
      <TimelineNode
        title="Workday started"
        subtitle={formatShortTime(startedAt)}
        tone={startedAt ? "active" : "muted"}
      />
      {sorted.map((visit, index) => (
        <View key={visit.id} style={styles.segment}>
          <View style={styles.connector} />
          <TimelineNode
            title={visit.title?.trim() || `Visit ${visit.sequence ?? index + 1}`}
            subtitle={[
              visit.description?.trim() || null,
              visit.pending ? "Pending sync" : "Completed",
              visit.sequence != null ? `#${visit.sequence}` : null
            ]
              .filter(Boolean)
              .join(" · ")}
            tone={visit.pending ? "muted" : "default"}
          />
        </View>
      ))}
      {syncEvents.map((event, index) => (
        <View key={`sync-${index}`} style={styles.segment}>
          <View style={styles.connector} />
          <TimelineNode title={event.title} subtitle={formatShortTime(event.at)} tone="muted" />
        </View>
      ))}
      {endedAt ? (
        <View style={styles.segment}>
          <View style={styles.connector} />
          <TimelineNode title="Workday ended" subtitle={formatShortTime(endedAt)} tone="active" />
        </View>
      ) : startedAt ? (
        <View style={styles.segment}>
          <View style={styles.connector} />
          <TimelineNode title="In progress" subtitle="Tracking active" tone="active" />
        </View>
      ) : null}
      {!startedAt && sorted.length === 0 ? (
        <Text style={styles.empty}>{t("daySummary.noVisitsYet")}</Text>
      ) : null}
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
    marginTop: Spacing.lg,
    padding: Spacing.md
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs
  },
  node: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.md
  },
  dot: {
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12
  },
  dotDefault: {
    backgroundColor: Colors.brand700
  },
  dotActive: {
    backgroundColor: Colors.green
  },
  dotMuted: {
    backgroundColor: Colors.text3
  },
  nodeCopy: {
    flex: 1,
    gap: 2
  },
  nodeTitle: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  nodeSubtitle: {
    color: Colors.text3,
    fontSize: FontSize.caption
  },
  segment: {
    gap: 0,
    paddingLeft: 0
  },
  connector: {
    backgroundColor: Colors.border,
    height: 12,
    marginBottom: 2,
    marginLeft: 5,
    width: 2
  },
  empty: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm
  }
});
