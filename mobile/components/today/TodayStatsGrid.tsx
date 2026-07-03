import type { ReactNode } from "react";
import { ClipboardList, Users } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { FieldWeather } from "../../../src/hooks/useFieldWeather";
import type { DashboardData } from "../../lib/types";
import { Grid, Harvest, Typography } from "../../lib/designSystem";
import { TODAY_CARD_GAP, TODAY_CARD_RADIUS, TODAY_PAGE_PAD, TODAY_SECTION_GAP } from "../../lib/todayLayout";
import { todayMetricCardStyle } from "../../lib/todayCardStyles";
import { TodayGradients, TodaySurfaces } from "../../lib/todaySurfaces";
import { Colors, FontWeight } from "../../lib/theme";
import { AppIcon, weatherIconForCode } from "../ui/AppIcon";
import { AnimatedCounter } from "../ui/AnimatedCounter";
import { LucideGlyph } from "../ui/AppIcon";
import { ShimmerBlock } from "../ui/ShimmerBlock";
import { FadeInSection, entranceStagger, type ScreenEntranceProps } from "../ui/FadeInSection";

type Props = {
  dashboard: DashboardData | null;
  farmersCovered: number;
  weather?: FieldWeather | null;
  weatherLoading?: boolean;
  visitsSubtitle?: string;
  farmersSubtitle?: string;
  entrance?: ScreenEntranceProps;
};

function planProgress(dashboard: DashboardData | null) {
  if (!dashboard) return { ratio: 0, completed: 0, pending: 0, total: 0 };
  const completed = dashboard.visits_today;
  const pending = dashboard.follow_ups_due;
  const total = completed + pending;
  const ratio = total > 0 ? completed / total : completed > 0 ? 1 : 0;
  return { ratio, completed, pending, total: Math.max(total, 1) };
}

function StatCard({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[todayMetricCardStyle, styles.cardInner, style]}>{children}</View>;
}

function KpiStat({
  icon,
  iconColors,
  value,
  label,
  footer,
  footerColor
}: {
  icon: typeof ClipboardList;
  iconColors: readonly [string, string];
  value: number;
  label: string;
  footer?: string;
  footerColor: string;
}) {
  return (
    <StatCard>
      <LinearGradient colors={[...iconColors]} style={styles.iconWell} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <LucideGlyph icon={icon} size={18} color={Colors.onPrimary} />
      </LinearGradient>
      <AnimatedCounter value={value} style={styles.value} duration={800} />
      <Text style={styles.label}>{label}</Text>
      {footer ? (
        <Text style={[styles.footer, { color: footerColor }]} numberOfLines={1}>
          {footer}
        </Text>
      ) : null}
    </StatCard>
  );
}

function WeatherStat({ weather, loading }: { weather?: FieldWeather | null; loading?: boolean }) {
  return (
    <StatCard style={TodaySurfaces.weather}>
      <LinearGradient colors={[...TodayGradients.weather]} style={StyleSheet.absoluteFill} />
      {loading && !weather ? (
        <ShimmerBlock width="60%" height={28} />
      ) : (
        <>
          <AppIcon name={weather ? weatherIconForCode(weather.code) : "cloud-sun"} size={22} color={Harvest.sky} />
          <Text style={styles.value}>{weather ? `${weather.tempC}°C` : "—"}</Text>
          <Text style={styles.label} numberOfLines={1}>
            {weather?.label ?? "—"}
          </Text>
          <View style={styles.miniRow}>
            <Text style={styles.mini}>{weather?.humidity != null ? `${weather.humidity}%` : "—"}</Text>
            <Text style={styles.mini}>{weather?.windKmh != null ? `${weather.windKmh}` : "—"}</Text>
            <Text style={styles.mini}>{weather?.rainChance != null ? `${weather.rainChance}%` : "—"}</Text>
          </View>
        </>
      )}
    </StatCard>
  );
}

function ProgressStat({ dashboard }: { dashboard: DashboardData | null }) {
  const { ratio, completed, pending, total } = planProgress(dashboard);
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - ratio);
  const pct = Math.round(ratio * 100);

  return (
    <StatCard style={TodaySurfaces.plan}>
      <LinearGradient colors={[...TodayGradients.plan]} style={StyleSheet.absoluteFill} />
      <View style={styles.progressInner}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle cx={c} cy={c} r={r} stroke="rgba(15,107,67,0.12)" strokeWidth={stroke} fill="none" />
            <Circle
              cx={c}
              cy={c}
              r={r}
              stroke={Colors.brand700}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${c}, ${c}`}
            />
          </Svg>
          <View style={[styles.ringCenter, { width: size, height: size }]}>
            <Text style={styles.ringPct}>{pct}%</Text>
          </View>
        </View>
        <View style={styles.progressCopy}>
          <Text style={styles.progressTitle}>
            {completed} / {total}
          </Text>
          <Text style={styles.progressSub}>Visits done</Text>
          <Text style={styles.progressRemain}>{pending} remaining</Text>
        </View>
      </View>
    </StatCard>
  );
}

/** 2×2 stats grid — visits, farmers, weather, progress. */
export function TodayStatsGrid({
  dashboard,
  farmersCovered,
  weather,
  weatherLoading,
  visitsSubtitle,
  farmersSubtitle,
  entrance
}: Props) {
  const body = (
    <View style={styles.grid}>
      <View style={styles.row}>
        <KpiStat
          icon={ClipboardList}
          iconColors={["#2E9B64", "#0F6B43"]}
          value={dashboard?.visits_today ?? 0}
          label="Visits today"
          footer={visitsSubtitle}
          footerColor={Colors.greenText}
        />
        <KpiStat
          icon={Users}
          iconColors={["#F59E0B", "#D97706"]}
          value={farmersCovered}
          label="Farmers covered"
          footer={farmersSubtitle}
          footerColor={Colors.amberText}
        />
      </View>
      <View style={styles.row}>
        <WeatherStat weather={weather} loading={weatherLoading} />
        <ProgressStat dashboard={dashboard} />
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

const styles = StyleSheet.create({
  grid: {
    gap: TODAY_CARD_GAP,
    marginTop: 0,
    paddingHorizontal: TODAY_PAGE_PAD
  },
  row: {
    flexDirection: "row",
    gap: TODAY_CARD_GAP
  },
  cardInner: {
    flex: 1,
    gap: 4,
    minHeight: 128,
    minWidth: 0,
    padding: Grid.md
  },
  iconWell: {
    alignItems: "center",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  value: {
    ...Typography.title,
    fontSize: 24,
    fontWeight: FontWeight.bold,
    marginTop: 4
  },
  label: {
    ...Typography.caption,
    color: Harvest.textMuted,
    fontSize: 11,
    lineHeight: 14
  },
  footer: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    marginTop: 2
  },
  miniRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4
  },
  mini: {
    ...Typography.caption,
    fontSize: 10
  },
  progressInner: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Grid.sm
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  ringPct: {
    fontSize: 12,
    fontWeight: FontWeight.bold
  },
  progressCopy: {
    flex: 1,
    gap: 2
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: FontWeight.bold
  },
  progressSub: {
    color: Harvest.textMuted,
    fontSize: 11
  },
  progressRemain: {
    color: Harvest.textMuted,
    fontSize: 10
  }
});
