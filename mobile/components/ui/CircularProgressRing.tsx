import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2 } from "lucide-react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { Grid, Harvest, Motion, PremiumRadius, PremiumShadow, Typography } from "../../lib/designSystem";
import { Colors, FontWeight } from "../../lib/theme";
import { LucideGlyph } from "./AppIcon";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  subtitle?: string;
  centerLabel?: string;
  variant?: "card" | "glass";
};

/** Circular progress ring — gradient stroke, animated sweep, completion check. */
export function CircularProgressRing({
  progress,
  size = 88,
  strokeWidth = 7,
  label,
  subtitle,
  centerLabel,
  variant = "card"
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const pct = Math.round(clamped * 100);
  const complete = clamped >= 1;

  const progressAnim = useSharedValue(0);
  const checkScale = useSharedValue(complete ? 1 : 0);

  useEffect(() => {
    progressAnim.value = 0;
    progressAnim.value = withTiming(clamped, {
      duration: Motion.slow,
      easing: Easing.out(Easing.cubic)
    });
    if (complete) {
      checkScale.value = withDelay(400, withSpring(1, Motion.spring));
    } else {
      checkScale.value = 0;
    }
  }, [checkScale, clamped, complete, progressAnim]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progressAnim.value)
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }]
  }));

  const isGlass = variant === "glass";

  return (
    <View style={[styles.wrap, !isGlass && PremiumShadow.card, isGlass && styles.wrapGlass]}>
      {!isGlass ? (
        <LinearGradient
          colors={["rgba(46,155,100,0.04)", "rgba(255,255,255,0.98)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : null}
      <View style={styles.ringRow}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Defs>
              <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#4ADE80" />
                <Stop offset="50%" stopColor={Colors.brand700} />
                <Stop offset="100%" stopColor="#0B3D28" />
              </SvgGradient>
            </Defs>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="rgba(15, 107, 67, 0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <AnimatedCircle
              animatedProps={animatedProps}
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#ringGrad)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeLinecap="round"
              rotation="-90"
              origin={`${center}, ${center}`}
            />
          </Svg>
          <View style={[styles.center, { width: size, height: size }]}>
            {complete ? (
              <Animated.View style={checkStyle}>
                <LucideGlyph icon={CheckCircle2} size={28} color={Colors.brand700} />
              </Animated.View>
            ) : (
              <Text style={styles.pct}>{centerLabel ?? `${pct}%`}</Text>
            )}
          </View>
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>{label}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          {!complete && subtitle ? (
            <Text style={styles.remaining}>Keep going — field work ahead</Text>
          ) : complete ? (
            <Text style={styles.done}>Plan complete for today</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Harvest.card,
    borderColor: Harvest.border,
    borderRadius: PremiumRadius.card,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    padding: Grid.md
  },
  wrapGlass: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: Grid.md
  },
  ringRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Grid.md
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  pct: {
    ...Typography.title,
    fontSize: 20,
    fontWeight: FontWeight.bold
  },
  copy: {
    flex: 1,
    gap: Grid.xxs
  },
  label: {
    ...Typography.bodyMedium,
    fontSize: 16,
    fontWeight: FontWeight.semibold
  },
  sub: {
    ...Typography.caption,
    color: Harvest.textSecondary,
    fontSize: 13
  },
  remaining: {
    ...Typography.caption,
    color: Harvest.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  done: {
    ...Typography.caption,
    color: Colors.greenText,
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    marginTop: 2
  }
});
