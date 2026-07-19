import { Play, PlayCircle } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { useI18n } from "../../../src/i18n/I18nContext";
import { FieldGradient } from "../../lib/fieldTheme";
import { heroCardShellStyle } from "../../lib/fieldCardStyles";
import { Grid, PremiumRadius, PremiumShadow, Typography } from "../../lib/designSystem";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../../lib/theme";
import { LucideGlyph } from "../ui/AppIcon";
import { FarmContourPattern } from "../ui/FarmContourPattern";
import { GlassSheen } from "../ui/GlassSheen";
import { ShimmerBlock } from "../ui/ShimmerBlock";
import { FlatCard } from "../layout/FlatCard";

function PulsingDot({ active }: { active: boolean }) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      opacity.value = 0.45;
      scale.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(withTiming(1.25, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false
    );
  }, [active, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

function HeroParticles() {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [drift]);
  const p1 = useAnimatedStyle(() => ({
    opacity: 0.15 + drift.value * 0.2,
    transform: [{ translateY: -drift.value * 6 }]
  }));
  const p2 = useAnimatedStyle(() => ({
    opacity: 0.1 + (1 - drift.value) * 0.15,
    transform: [{ translateX: drift.value * 4 }]
  }));
  return (
    <>
      <Animated.View style={[styles.particle, styles.p1, p1]} />
      <Animated.View style={[styles.particle, styles.p2, p2]} />
    </>
  );
}

function MovingGradient() {
  const shift = useSharedValue(0);
  useEffect(() => {
    shift.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shift]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * 40 - 20 }]
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient
        colors={["transparent", "rgba(255,255,255,0.08)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export type WorkdayHeroProps = {
  active: boolean;
  timerDisplay: string;
  startedAtLabel?: string | null;
  lastSyncLabel?: string | null;
  busy?: boolean;
  onStart: () => void;
  startLabel?: string;
  idleTitle?: string;
  idleSubtitle?: string;
  statItems?: { label: string; value: string }[];
};

export function WorkdayHero({
  active,
  timerDisplay,
  startedAtLabel,
  lastSyncLabel,
  busy = false,
  onStart,
  startLabel,
  idleTitle,
  idleSubtitle,
  statItems
}: WorkdayHeroProps) {
  const { t } = useI18n();
  const resolvedStartLabel = startLabel ?? t("workdayUx.startWorkday");
  const resolvedIdleTitle = idleTitle ?? t("workdayUx.startYourWorkday");
  const resolvedIdleSubtitle = idleSubtitle ?? t("workdayUx.startHelper");

  if (!active) {
    return (
      <FlatCard padded={false} style={[styles.idleCard, PremiumShadow.card]}>
        <LinearGradient
          colors={["rgba(232,245,238,0.6)", "rgba(255,255,255,0.95)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <GlassSheen borderRadius={PremiumRadius.card} />
        <View style={styles.idleHeader}>
          <LinearGradient colors={["#E8F5EE", "#D4EDDF"]} style={styles.idleIconWrap}>
            <LucideGlyph icon={PlayCircle} size={26} color={Colors.brand700} />
          </LinearGradient>
          <View style={styles.idleCopy}>
            <Text style={styles.idleTitle}>{resolvedIdleTitle}</Text>
            <Text style={styles.idleSub}>{resolvedIdleSubtitle}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onStart}
          style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.92 }, busy && { opacity: 0.6 }]}
        >
          <LinearGradient
            colors={["#2E9B64", "#0F6B43"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startBtnGradient}
          >
            {busy ? (
              <ShimmerBlock width={120} height={20} borderRadius={10} />
            ) : (
              <>
                <LucideGlyph icon={Play} size={18} color={Colors.onPrimary} fill={Colors.onPrimary} />
                <Text style={styles.startBtnText}>{resolvedStartLabel}</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </FlatCard>
    );
  }

  const metrics =
    statItems && statItems.length > 0
      ? statItems
      : lastSyncLabel
        ? [{ label: t("myLocation.lastSync"), value: lastSyncLabel }]
        : [];

  return (
    <View style={[heroCardShellStyle, styles.activeShell, PremiumShadow.hero]}>
      <LinearGradient
        colors={[...FieldGradient.heroActive]}
        locations={[...FieldGradient.heroActiveLocations]}
        style={StyleSheet.absoluteFill}
      />
      <MovingGradient />
      {Platform.OS === "ios" ? (
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      <GlassSheen borderRadius={PremiumRadius.hero} />
      <FarmContourPattern />
      <HeroParticles />
      <View style={styles.glassHighlight} pointerEvents="none" />
      <View style={styles.activeInner}>
        <View style={styles.activeTop}>
          <View style={styles.activeStatus}>
            <PulsingDot active />
            <Text style={styles.activeStatusText}>Workday active</Text>
          </View>
        </View>

        <Text style={styles.timer} accessibilityLabel={`Workday timer ${timerDisplay}`}>
          {timerDisplay}
        </Text>

        {startedAtLabel ? <Text style={styles.startedMeta}>Started {startedAtLabel}</Text> : null}

        <View style={styles.statGrid}>
          {metrics.map((item) => (
            <View key={item.label} style={styles.statCell}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {lastSyncLabel ? <Text style={styles.syncMeta}>{lastSyncLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  idleCard: {
    gap: Spacing.md,
    marginHorizontal: Grid.md,
    overflow: "hidden",
    padding: Grid.md
  },
  idleHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md
  },
  idleIconWrap: {
    alignItems: "center",
    borderRadius: PremiumRadius.sm,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  idleCopy: {
    flex: 1,
    gap: 4
  },
  idleTitle: {
    ...Typography.subtitle,
    fontSize: 17,
    fontWeight: FontWeight.semibold
  },
  idleSub: {
    ...Typography.caption,
    fontSize: 14
  },
  startBtn: {
    borderRadius: PremiumRadius.md,
    overflow: "hidden"
  },
  startBtnGradient: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    height: Layout.touchTargetMin,
    justifyContent: "center"
  },
  startBtnText: {
    color: Colors.surface,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  },
  activeShell: {
    overflow: "hidden"
  },
  glassHighlight: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderBottomLeftRadius: PremiumRadius.hero,
    borderBottomRightRadius: PremiumRadius.hero,
    height: 1,
    left: Grid.lg,
    position: "absolute",
    right: Grid.lg,
    top: 0
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Grid.xs,
    paddingHorizontal: Grid.lg,
    paddingTop: Grid.sm
  },
  badge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  workdayBadge: {
    backgroundColor: "rgba(107,196,138,0.25)"
  },
  badgeText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 11,
    fontWeight: FontWeight.semibold
  },
  particle: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 3,
    height: 4,
    position: "absolute",
    width: 4
  },
  p1: { right: 24, top: 20 },
  p2: { bottom: 32, left: 20 },
  activeInner: {
    gap: Grid.xs,
    padding: Grid.md,
    paddingTop: Grid.sm
  },
  activeTop: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  activeStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: Grid.xs
  },
  dot: {
    backgroundColor: "#6BC48A",
    borderRadius: 4,
    height: 8,
    width: 8
  },
  activeStatusText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: FontSize.label,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  timer: {
    color: Colors.surface,
    fontSize: 36,
    fontVariant: ["tabular-nums"],
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    lineHeight: 42
  },
  startedMeta: {
    color: "rgba(255,255,255,0.85)",
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    marginTop: -2
  },
  statGrid: {
    flexDirection: "row",
    gap: Grid.xs,
    marginTop: Grid.sm
  },
  statCell: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 8
  },
  statValue: {
    color: Colors.surface,
    fontSize: FontSize.body,
    fontVariant: ["tabular-nums"],
    fontWeight: FontWeight.bold
  },
  statLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: FontSize.label,
    fontWeight: FontWeight.medium
  },
  syncMeta: {
    color: Colors.onPrimaryMuted,
    fontSize: FontSize.caption,
    marginTop: 2
  },
  endBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: PremiumRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    marginTop: Spacing.md,
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: Spacing.lg
  },
  endBtnText: {
    color: Colors.onPrimary,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  }
});
