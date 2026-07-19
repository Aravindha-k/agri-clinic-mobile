import type { ReactNode } from "react";
import { ClipboardCheck, Crosshair, MapPin, Percent, Target } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { Grid, Harvest, Typography } from "../../lib/designSystem";
import { TODAY_CARD_GAP, TODAY_PAGE_PAD } from "../../lib/todayLayout";
import { todayMetricCardStyle } from "../../lib/todayCardStyles";
import { Colors, FontWeight } from "../../lib/theme";
import { AnimatedCounter } from "../ui/AnimatedCounter";
import { LucideGlyph } from "../ui/AppIcon";
import { FadeInSection, entranceStagger, type ScreenEntranceProps } from "../ui/FadeInSection";

export type TodayKpiModel = {
  target: number;
  completed: number;
  remaining: number;
  successPct: number;
  distanceLabel: string;
};

type Props = {
  kpis: TodayKpiModel;
  entrance?: ScreenEntranceProps;
};

function StatCard({ children }: { children: ReactNode }) {
  return <View style={[todayMetricCardStyle, styles.cardInner]}>{children}</View>;
}

function KpiStat({
  icon,
  iconColors,
  value,
  label,
  valueText
}: {
  icon: typeof Target;
  iconColors: readonly [string, string];
  value?: number;
  valueText?: string;
  label: string;
}) {
  return (
    <StatCard>
      <LinearGradient colors={[...iconColors]} style={styles.iconWell} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <LucideGlyph icon={icon} size={16} color={Colors.onPrimary} />
      </LinearGradient>
      {valueText != null ? (
        <Text style={styles.valueText} numberOfLines={1}>
          {valueText}
        </Text>
      ) : (
        <AnimatedCounter value={value ?? 0} style={styles.value} duration={700} />
      )}
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </StatCard>
  );
}

/** Field-force KPI grid for Today. */
export function TodayKpiGrid({ kpis, entrance }: Props) {
  const body = (
    <View style={styles.grid}>
      <View style={styles.row}>
        <KpiStat icon={Target} iconColors={["#2E9B64", "#0F6B43"]} value={kpis.target} label="Today's target" />
        <KpiStat
          icon={ClipboardCheck}
          iconColors={["#14B8A6", "#0D9488"]}
          value={kpis.completed}
          label="Completed visits"
        />
      </View>
      <View style={styles.row}>
        <KpiStat icon={Crosshair} iconColors={["#F59E0B", "#D97706"]} value={kpis.remaining} label="Remaining visits" />
        <KpiStat
          icon={Percent}
          iconColors={["#8B5CF6", "#6D28D9"]}
          valueText={`${kpis.successPct}%`}
          label="Success %"
        />
      </View>
      <View style={styles.row}>
        <KpiStat
          icon={MapPin}
          iconColors={["#0EA5E9", "#0284C7"]}
          valueText={kpis.distanceLabel}
          label="Distance travelled"
        />
        <View style={styles.spacer} />
      </View>
    </View>
  );

  if (!entrance) return body;
  return (
    <FadeInSection replayKey={entrance.replayKey} delay={entranceStagger(entrance.sectionStep)} variant="card">
      {body}
    </FadeInSection>
  );
}

export function buildTodayKpis(input: {
  visitsToday: number;
  followUpsDue: number;
  distanceKm: number | null | undefined;
  dutyActive: boolean;
}): TodayKpiModel {
  const completed = Math.max(0, input.visitsToday);
  const remaining = Math.max(0, input.followUpsDue);
  const target = Math.max(completed + remaining, completed, 0);
  const successPct = target > 0 ? Math.round((completed / target) * 100) : completed > 0 ? 100 : 0;
  let distanceLabel = "0 km";
  if (input.distanceKm != null && Number.isFinite(input.distanceKm)) {
    distanceLabel = `${input.distanceKm.toFixed(1)} km`;
  } else if (input.dutyActive) {
    distanceLabel = "Calculating...";
  }
  return { target, completed, remaining, successPct, distanceLabel };
}

const styles = StyleSheet.create({
  grid: {
    gap: TODAY_CARD_GAP,
    paddingHorizontal: TODAY_PAGE_PAD
  },
  row: {
    flexDirection: "row",
    gap: TODAY_CARD_GAP
  },
  spacer: {
    flex: 1
  },
  cardInner: {
    flex: 1,
    gap: 4,
    minHeight: 96,
    minWidth: 0,
    padding: Grid.sm + 2
  },
  iconWell: {
    alignItems: "center",
    borderRadius: 10,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  value: {
    ...Typography.title,
    fontSize: 22,
    fontWeight: FontWeight.bold,
    marginTop: 2
  },
  valueText: {
    ...Typography.title,
    fontSize: 18,
    fontWeight: FontWeight.bold,
    marginTop: 2
  },
  label: {
    ...Typography.caption,
    color: Harvest.textMuted,
    fontSize: 11,
    lineHeight: 14
  }
});
