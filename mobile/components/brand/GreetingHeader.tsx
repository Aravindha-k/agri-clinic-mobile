import { Calendar, Clock } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { Grid, Harvest, Typography } from "../../lib/designSystem";
import { Colors, FontWeight } from "../../lib/theme";
import { LucideGlyph } from "../ui/AppIcon";

type Props = {
  timeGreeting: string;
  welcomePrefix: string;
  firstName?: string | null;
  operationsLine: string;
  dateLabel?: string;
  timeLabel?: string;
};

/** Welcome copy inside Today hero glass — no opaque card shell. */
export function GreetingHeader({
  timeGreeting,
  welcomePrefix,
  firstName,
  operationsLine,
  dateLabel,
  timeLabel
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <Text style={styles.timeGreeting}>
          {timeGreeting} <Text style={styles.leafEmoji}>🍃</Text>
        </Text>
        <Text style={styles.welcomeLine}>
          {welcomePrefix}
          {firstName ? "," : ""}
        </Text>
        {firstName ? (
          <Text style={styles.firstName} numberOfLines={1}>
            {firstName}
          </Text>
        ) : null}
        <Text style={styles.operationsLine} numberOfLines={2}>
          {operationsLine}
        </Text>
      </View>
      {dateLabel || timeLabel ? (
        <View style={styles.footer}>
          {dateLabel ? (
            <View style={styles.metaItem}>
              <LucideGlyph icon={Calendar} size={13} color={Harvest.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {dateLabel}
              </Text>
            </View>
          ) : null}
          {dateLabel && timeLabel ? <View style={styles.divider} /> : null}
          {timeLabel ? (
            <View style={styles.metaItem}>
              <LucideGlyph icon={Clock} size={13} color={Harvest.textMuted} />
              <Text style={styles.metaText}>{timeLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Grid.sm,
    paddingBottom: Grid.md,
    paddingHorizontal: Grid.lg,
    paddingTop: Grid.sm
  },
  copy: {
    gap: 2,
    maxWidth: "72%"
  },
  timeGreeting: {
    ...Typography.label,
    color: Colors.brand700,
    fontSize: 15,
    fontWeight: FontWeight.semibold
  },
  leafEmoji: {
    fontSize: 14
  },
  welcomeLine: {
    color: Harvest.forest,
    fontSize: 17,
    fontWeight: FontWeight.medium,
    marginTop: 4
  },
  firstName: {
    color: Harvest.forest,
    fontSize: 34,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    lineHeight: 40,
    marginTop: 2
  },
  operationsLine: {
    color: Harvest.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Grid.sm
  },
  footer: {
    alignItems: "center",
    borderTopColor: "rgba(15, 61, 40, 0.1)",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Grid.md,
    marginTop: Grid.xs,
    paddingTop: Grid.md
  },
  metaItem: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minWidth: 0
  },
  divider: {
    backgroundColor: "rgba(15, 61, 40, 0.12)",
    height: 18,
    width: StyleSheet.hairlineWidth
  },
  metaText: {
    color: Harvest.textSecondary,
    fontSize: 12,
    fontWeight: FontWeight.medium
  }
});
