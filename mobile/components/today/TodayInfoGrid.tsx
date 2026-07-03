import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import type { FieldWeather } from "../../../src/hooks/useFieldWeather";
import type { DashboardData, DashboardFollowUp } from "../../lib/types";
import { Grid, Harvest, PremiumShadow, Typography } from "../../lib/designSystem";
import { TODAY_CARD_GAP, TODAY_CARD_RADIUS, TODAY_PAGE_PAD, TODAY_SECTION_GAP } from "../../lib/todayLayout";
import { TodayGradients, TodaySurfaces } from "../../lib/todaySurfaces";
import { Colors, FontWeight } from "../../lib/theme";
import { AppIcon, weatherIconForCode } from "../ui/AppIcon";
import { ShimmerBlock } from "../ui/ShimmerBlock";
import { FadeInSection, entranceStagger, type ScreenEntranceProps } from "../ui/FadeInSection";

type Props = {
  dashboard: DashboardData | null;
  followUps: DashboardFollowUp[];
  farmersCovered: number;
  weather?: FieldWeather | null;
  weatherLoading?: boolean;
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

function healthCounts(followUps: DashboardFollowUp[], farmersCovered: number) {
  const critical = followUps.filter((f) => f.days_overdue > 0).length;
  const attention = followUps.filter((f) => f.due_today || f.days_overdue === 0).length;
  const healthy = Math.max(0, farmersCovered - critical - attention);
  return { healthy, attention, critical };
}

function CompactWeather({ weather, loading }: { weather?: FieldWeather | null; loading?: boolean }) {
  return (
    <View style={[styles.cell, TodaySurfaces.weather, PremiumShadow.card]}>
      <LinearGradient colors={[...TodayGradients.weather]} style={StyleSheet.absoluteFill} />
      {loading && !weather ? (
        <ShimmerBlock width="60%" height={28} />
      ) : (
        <>
          <AppIcon name={weather ? weatherIconForCode(weather.code) : "cloud-sun"} size={22} color={Harvest.sky} />
          <Text style={styles.temp}>{weather ? `${weather.tempC}°C` : "—"}</Text>
          <Text style={styles.cond} numberOfLines={1}>
            {weather?.label ?? "—"}
          </Text>
          <View style={styles.miniMetrics}>
            <Text style={styles.mini}>{weather?.humidity != null ? `${weather.humidity}%` : "—"}</Text>
            <Text style={styles.mini}>{weather?.windKmh != null ? `${weather.windKmh}` : "—"}</Text>
            <Text style={styles.mini}>{weather?.rainChance != null ? `${weather.rainChance}%` : "—"}</Text>
          </View>
        </>
      )}
    </View>
  );
}

function CompactProgress({ dashboard }: { dashboard: DashboardData | null }) {
  const { ratio, completed, pending, total } = planProgress(dashboard);
  const size = 52;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - ratio);
  const pct = Math.round(ratio * 100);

  return (
    <View style={[styles.cell, TodaySurfaces.plan, PremiumShadow.card]}>
      <LinearGradient colors={[...TodayGradients.plan]} style={StyleSheet.absoluteFill} />
      <View style={styles.progressRow}>
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
    </View>
  );
}

function CompactHealth({
  followUps,
  farmersCovered
}: {
  followUps: DashboardFollowUp[];
  farmersCovered: number;
}) {
  const { healthy, attention, critical } = healthCounts(followUps, farmersCovered);
  const total = Math.max(healthy + attention + critical, 1);
  const pct = Math.round((healthy / total) * 100);
  const size = 52;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <View style={[styles.cell, TodaySurfaces.fieldHealth, PremiumShadow.card]}>
      <LinearGradient colors={[...TodayGradients.fieldHealth]} style={StyleSheet.absoluteFill} />
      <View style={{ alignItems: "center", width: size, height: size, alignSelf: "center" }}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="hG" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#4ADE80" />
              <Stop offset="100%" stopColor={Colors.brand700} />
            </SvgGradient>
          </Defs>
          <Circle cx={c} cy={c} r={r} stroke="rgba(15,107,67,0.1)" strokeWidth={stroke} fill="none" />
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke="url(#hG)"
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
          <AppIcon name="leaf" size={16} color={Colors.brand700} />
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendItem}>
          <Text style={styles.dotG}>● </Text>
          {healthy} Healthy
        </Text>
        <Text style={styles.legendItem}>
          <Text style={styles.dotA}>● </Text>
          {attention} Attention
        </Text>
        <Text style={styles.legendItem}>
          <Text style={styles.dotC}>● </Text>
          {critical} Critical
        </Text>
      </View>
    </View>
  );
}

/** Three-column info row — weather, progress, field health (reference layout). */
export function TodayInfoGrid({ dashboard, followUps, farmersCovered, weather, weatherLoading, entrance }: Props) {
  const body = (
    <View style={styles.row}>
      <CompactWeather weather={weather} loading={weatherLoading} />
      <CompactProgress dashboard={dashboard} />
      <CompactHealth followUps={followUps} farmersCovered={farmersCovered} />
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
  row: {
    flexDirection: "row",
    gap: TODAY_CARD_GAP,
    marginTop: TODAY_SECTION_GAP,
    paddingHorizontal: TODAY_PAGE_PAD
  },
  cell: {
    borderRadius: TODAY_CARD_RADIUS,
    flex: 1,
    gap: 4,
    minHeight: 128,
    minWidth: 0,
    overflow: "hidden",
    padding: Grid.sm
  },
  temp: {
    ...Typography.title,
    fontSize: 18,
    fontWeight: FontWeight.bold,
    marginTop: 4
  },
  cond: {
    ...Typography.caption,
    fontSize: 10
  },
  miniMetrics: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6
  },
  mini: {
    ...Typography.caption,
    fontSize: 9
  },
  progressRow: {
    alignItems: "center",
    flex: 1,
    gap: 4
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  ringPct: {
    fontSize: 11,
    fontWeight: FontWeight.bold
  },
  progressCopy: {
    gap: 1
  },
  progressTitle: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  progressSub: {
    ...Typography.caption,
    fontSize: 9,
    textAlign: "center"
  },
  progressRemain: {
    ...Typography.caption,
    color: Harvest.textMuted,
    fontSize: 9,
    textAlign: "center"
  },
  legend: {
    gap: 2,
    marginTop: 4
  },
  legendItem: {
    ...Typography.caption,
    fontSize: 8,
    textAlign: "center"
  },
  dotG: { color: Colors.greenText },
  dotA: { color: Colors.amberText },
  dotC: { color: Colors.redText }
});
