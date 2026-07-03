import { AlertCircle, ClipboardList, Users, type LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Grid, IconSize, Motion, PremiumShadow, Typography } from "../../lib/designSystem";
import { TODAY_CARD_GAP, TODAY_CARD_RADIUS, TODAY_PAGE_PAD, TODAY_SECTION_GAP } from "../../lib/todayLayout";
import { Colors, FontWeight } from "../../lib/theme";
import { AnimatedCounter } from "../ui/AnimatedCounter";
import { IconPopOnce } from "../ui/IconPopOnce";
import { LucideGlyph } from "../ui/AppIcon";
import { PressableCard } from "../ui/PressableCard";
import { FadeInSection, entranceStagger, type ScreenEntranceProps } from "../ui/FadeInSection";

const TILES: Record<
  string,
  { icon: LucideIcon; colors: readonly [string, string]; subtitleColor: string }
> = {
  visits: { icon: ClipboardList, colors: ["#2E9B64", "#0F6B43"], subtitleColor: Colors.greenText },
  followUps: { icon: AlertCircle, colors: ["#8B5CF6", "#6D28D9"], subtitleColor: "#7C3AED" },
  farmers: { icon: Users, colors: ["#F59E0B", "#D97706"], subtitleColor: Colors.amberText }
};

type Props = {
  visitsToday: number;
  followUpsDue: number;
  farmersCovered: number;
  visitsSubtitle?: string;
  followUpsSubtitle?: string;
  farmersSubtitle?: string;
  entrance?: ScreenEntranceProps;
};

function KpiCard({
  tileKey,
  label,
  value,
  subtitle,
  index
}: {
  tileKey: keyof typeof TILES;
  label: string;
  value: number;
  subtitle?: string;
  index: number;
}) {
  const tile = TILES[tileKey];
  const lift = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 2 }]
  }));

  return (
    <Animated.View style={[styles.tileOuter, cardStyle]}>
      <PressableCard
        onPress={() => undefined}
        onPressIn={() => {
          lift.value = withSpring(1, Motion.springSoft);
        }}
        onPressOut={() => {
          lift.value = withSpring(0, Motion.springSoft);
        }}
      >
        <View style={[styles.tile, PremiumShadow.card]}>
          <LinearGradient colors={[...tile.colors]} style={styles.iconWell} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <IconPopOnce icon={tile.icon} size={IconSize.sm} color={Colors.onPrimary} delay={index * 60} />
          </LinearGradient>
          <AnimatedCounter value={value} style={styles.value} duration={800} />
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: tile.subtitleColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </PressableCard>
    </Animated.View>
  );
}

/** Daily KPI strip — matches reference mock (3 equal cards). */
export function TodayInsightsRow({
  visitsToday,
  followUpsDue,
  farmersCovered,
  visitsSubtitle,
  followUpsSubtitle,
  farmersSubtitle,
  entrance
}: Props) {
  const content = (
    <View style={styles.row}>
      <KpiCard tileKey="visits" label="Visits today" value={visitsToday} subtitle={visitsSubtitle} index={0} />
      <KpiCard tileKey="followUps" label="Follow-ups" value={followUpsDue} subtitle={followUpsSubtitle} index={1} />
      <KpiCard tileKey="farmers" label="Farmers covered" value={farmersCovered} subtitle={farmersSubtitle} index={2} />
    </View>
  );

  if (!entrance) return content;
  return (
    <FadeInSection replayKey={entrance.replayKey} delay={entranceStagger(entrance.sectionStep)} variant="card">
      {content}
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
  tileOuter: {
    flex: 1,
    minWidth: 0
  },
  tile: {
    backgroundColor: Colors.surface,
    borderColor: "rgba(15, 61, 40, 0.06)",
    borderRadius: TODAY_CARD_RADIUS,
    borderWidth: 1,
    gap: 2,
    padding: Grid.sm
  },
  iconWell: {
    alignItems: "center",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  value: {
    ...Typography.title,
    fontSize: 22,
    fontWeight: FontWeight.bold,
    marginTop: 4
  },
  label: {
    ...Typography.caption,
    fontSize: 10,
    lineHeight: 13
  },
  subtitle: {
    fontSize: 10,
    fontWeight: FontWeight.semibold
  }
});
