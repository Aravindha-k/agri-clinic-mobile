import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";

function PulsingDot({ active }: { active: boolean }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      opacity.value = 0.45;
      return;
    }
    opacity.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 750 }), withTiming(1, { duration: 750 })),
      -1,
      false
    );
  }, [active, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.dot, { backgroundColor: Colors.green }, style]} />
  );
}

export type WorkdayHeroProps = {
  active: boolean;
  timerDisplay: string;
  startedAtLabel?: string | null;
  distanceKm?: number;
  lastSyncLabel?: string | null;
  busy?: boolean;
  onStart: () => void;
  onEnd?: () => void;
  startLabel?: string;
  endLabel?: string;
  idleTitle?: string;
  idleSubtitle?: string;
  statItems?: { label: string; value: string }[];
};

export function WorkdayHero({
  active,
  timerDisplay,
  startedAtLabel,
  distanceKm = 0,
  lastSyncLabel,
  busy = false,
  onStart,
  onEnd,
  startLabel = "Start workday",
  endLabel = "End day",
  idleTitle = "Start your workday",
  idleSubtitle = "GPS activates when you start",
  statItems
}: WorkdayHeroProps) {
  if (!active) {
    return (
      <FlatCard style={styles.idleCard}>
        <View style={styles.idleHeader}>
          <View style={styles.idleIconWrap}>
            <Ionicons name="time-outline" size={22} color={Colors.brand700} />
          </View>
          <View style={styles.idleCopy}>
            <Text style={styles.idleTitle}>{idleTitle}</Text>
            <Text style={styles.idleSub}>{idleSubtitle}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onStart}
          style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.92 }, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.startBtnText}>{startLabel}</Text>
            </>
          )}
        </Pressable>
      </FlatCard>
    );
  }

  const distanceLabel = `${distanceKm.toFixed(1)} km`;

  return (
    <View style={styles.activeCard}>
      <View style={styles.activeTop}>
        <View style={styles.activeStatus}>
          <PulsingDot active />
          <Text style={styles.activeStatusText}>Workday active</Text>
        </View>
        {onEnd ? (
          <Pressable
            accessibilityRole="button"
            onPress={onEnd}
            style={({ pressed }) => [styles.endBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.endBtnText}>{endLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {statItems?.length ? (
        <View style={styles.statRow}>
          {statItems.map((item) => (
            <View key={item.label} style={styles.statCell}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.timer} accessibilityLabel={`Workday timer ${timerDisplay}`}>
          {timerDisplay}
        </Text>
      )}
      <Text style={styles.activeMeta}>
        {startedAtLabel ? `Started ${startedAtLabel}` : "Workday active"}
        {!statItems?.length ? ` · ${distanceLabel}` : ""}
      </Text>
      {lastSyncLabel ? <Text style={styles.syncMeta}>{lastSyncLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  idleCard: {
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: 18
  },
  idleHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md
  },
  idleIconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.inner,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  idleCopy: {
    flex: 1,
    gap: 4
  },
  idleTitle: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  idleSub: {
    color: Colors.text3,
    fontSize: FontSize.md
  },
  startBtn: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: Radius.button,
    flexDirection: "row",
    gap: Spacing.sm,
    height: Layout.touchTargetMin,
    justifyContent: "center"
  },
  startBtnText: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  activeCard: {
    backgroundColor: Colors.brand700,
    borderRadius: Radius.card,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    padding: 18
  },
  activeTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  activeStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  activeStatusText: {
    color: Colors.brand100,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3
  },
  endBtn: {
    backgroundColor: Colors.red,
    borderRadius: Radius.inner,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  endBtnText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  timer: {
    color: Colors.surface,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.5,
    lineHeight: 38
  },
  statRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 2
  },
  statCell: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: Radius.md,
    flex: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  statValue: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontVariant: ["tabular-nums"],
    fontWeight: FontWeight.bold
  },
  statLabel: {
    color: Colors.brand100,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium
  },
  activeMeta: {
    color: Colors.brand100,
    fontSize: FontSize.base
  },
  syncMeta: {
    color: "rgba(255,255,255,0.65)",
    fontSize: FontSize.sm
  }
});
