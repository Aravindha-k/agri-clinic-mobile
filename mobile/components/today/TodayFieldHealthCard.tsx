import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import type { DashboardFollowUp } from "../../lib/types";
import { Grid, Harvest, Motion, PremiumShadow, Typography } from "../../lib/designSystem";
import { TodayGradients, TodaySectionGap, TodaySurfaces } from "../../lib/todaySurfaces";
import { Colors, FontWeight } from "../../lib/theme";
import { AnimatedCounter } from "../ui/AnimatedCounter";
import { FadeInSection, entranceStagger, type ScreenEntranceProps } from "../ui/FadeInSection";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  followUps: DashboardFollowUp[];
  farmersCovered: number;
  entrance?: ScreenEntranceProps;
};

function fieldHealthCounts(followUps: DashboardFollowUp[], farmersCovered: number) {
  const critical = followUps.filter((f) => f.days_overdue > 0).length;
  const needsAttention = followUps.filter((f) => f.due_today || f.days_overdue === 0).length;
  const healthy = Math.max(0, farmersCovered - critical - needsAttention);
  const total = Math.max(farmersCovered, healthy + needsAttention + critical, 1);
  const overallPct = Math.round((healthy / total) * 100);
  return { healthy, needsAttention, critical, overallPct, total };
}

function HealthRow({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "healthy" | "attention" | "critical";
}) {
  const dotColor = {
    healthy: Colors.greenText,
    attention: Colors.amberText,
    critical: Colors.redText
  }[tone];

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <AnimatedCounter value={value} style={StyleSheet.flatten([styles.rowValue, { color: dotColor }])} />
    </View>
  );
}

function OverallRing({ pct }: { pct: number }) {
  const size = 108;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(pct / 100, 1));

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(ratio, { duration: Motion.slow, easing: Easing.out(Easing.cubic) });
  }, [progress, ratio]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value)
  }));

  return (
    <View style={styles.ringCol}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#4ADE80" />
              <Stop offset="100%" stopColor={Colors.brand700} />
            </SvgGradient>
          </Defs>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(15,107,67,0.1)"
            strokeWidth={stroke}
            fill="none"
          />
          <AnimatedCircle
            animatedProps={ringProps}
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#healthGrad)"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>
        <View style={[styles.ringCenter, { width: size, height: size }]}>
          <Text style={styles.ringPct}>{pct}%</Text>
        </View>
      </View>
      <Text style={styles.ringCaption}>Overall health</Text>
    </View>
  );
}

/** Field health — stat rows + one overall health ring. */
export function TodayFieldHealthCard({ followUps, farmersCovered, entrance }: Props) {
  const counts = fieldHealthCounts(followUps, farmersCovered);

  const body = (
    <View style={[styles.card, TodaySurfaces.fieldHealth, PremiumShadow.card]}>
      <LinearGradient
        colors={[...TodayGradients.fieldHealth]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Text style={styles.title}>Field health</Text>
      <View style={styles.body}>
        <View style={styles.statsCol}>
          <HealthRow label="Healthy" value={counts.healthy} tone="healthy" />
          <HealthRow label="Needs attention" value={counts.needsAttention} tone="attention" />
          <HealthRow label="Critical" value={counts.critical} tone="critical" />
        </View>
        <OverallRing pct={counts.overallPct} />
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
  card: {
    gap: Grid.sm,
    marginHorizontal: Grid.md,
    marginTop: TodaySectionGap,
    padding: Grid.md
  },
  title: {
    ...Typography.subtitle,
    fontSize: 17,
    fontWeight: FontWeight.semibold
  },
  body: {
    alignItems: "center",
    flexDirection: "row",
    gap: Grid.md
  },
  statsCol: {
    flex: 1,
    gap: Grid.sm
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Grid.xs
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  rowLabel: {
    ...Typography.caption,
    color: Harvest.textSecondary,
    flex: 1,
    fontSize: 13
  },
  rowValue: {
    fontSize: 20,
    fontWeight: FontWeight.bold,
    minWidth: 28,
    textAlign: "right"
  },
  ringCol: {
    alignItems: "center",
    gap: Grid.xs
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  ringPct: {
    ...Typography.title,
    fontSize: 24,
    fontWeight: FontWeight.bold
  },
  ringCaption: {
    ...Typography.caption,
    color: Harvest.textMuted,
    fontSize: 11,
    textAlign: "center"
  }
});
