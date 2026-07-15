import { useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { Colors, Enterprise, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

export type WorkSegment = "queue" | "visits";

type Props = {
  segment: WorkSegment;
  queueLabel: string;
  visitsLabel: string;
  onChange: (segment: WorkSegment) => void;
};

export function WorkSegmentBar({ segment, queueLabel, visitsLabel, onChange }: Props) {
  const { coreMotion } = usePremiumMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (!trackWidth) return;
    const segmentWidth = (trackWidth - 6) / 2;
    const target = segment === "queue" ? 0 : segmentWidth;
    indicatorX.value = coreMotion
      ? withTiming(target, { duration: Enterprise.motion.normal })
      : target;
  }, [coreMotion, indicatorX, segment, trackWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }]
  }));

  function onTrackLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.wrap} onLayout={onTrackLayout}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          trackWidth ? { width: (trackWidth - 6) / 2 } : null,
          indicatorStyle
        ]}
      />
      <Pressable
        onPress={() => onChange("queue")}
        style={styles.segment}
        accessibilityRole="tab"
        accessibilityLabel={queueLabel}
        accessibilityState={{ selected: segment === "queue" }}
      >
        <Text style={[styles.label, segment === "queue" && styles.labelActive]}>{queueLabel}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("visits")}
        style={styles.segment}
        accessibilityRole="tab"
        accessibilityLabel={visitsLabel}
        accessibilityState={{ selected: segment === "visits" }}
      >
        <Text style={[styles.label, segment === "visits" && styles.labelActive]}>{visitsLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Enterprise.radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: 3,
    position: "relative"
  },
  indicator: {
    backgroundColor: Colors.brand700,
    borderRadius: Radius.inner,
    bottom: 3,
    left: 3,
    position: "absolute",
    top: 3
  },
  segment: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: Spacing.sm,
    zIndex: 1
  },
  label: {
    color: Colors.text3,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  },
  labelActive: {
    color: Colors.surface
  }
});
