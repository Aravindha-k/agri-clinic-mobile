import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { LOGO_SIZES } from "../../brand/logoSizing";
import { LOGO_IMAGE } from "../../config/brand";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  size?: number;
  style?: ViewStyle;
  /** Gentle pulse — visible but keeps the mark sharp. */
  animate?: boolean;
  showGlow?: boolean;
};

export function AnimatedBrandLogo({
  size = LOGO_SIZES.homeHeader,
  style,
  animate = true,
  showGlow = false
}: Props) {
  const breathe = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.25)).current;
  const { reduced } = usePremiumMotion();
  const shouldAnimate = animate && !reduced && Boolean(LOGO_IMAGE);

  useEffect(() => {
    if (!shouldAnimate) {
      breathe.setValue(1);
      glow.setValue(0.25);
      return;
    }

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.06,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.4, duration: 1600, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.2, duration: 1600, useNativeDriver: true })
      ])
    );

    breatheLoop.start();
    if (showGlow) {
      glowLoop.start();
    }
    return () => {
      breatheLoop.stop();
      glowLoop.stop();
    };
  }, [breathe, glow, shouldAnimate, showGlow]);

  if (!LOGO_IMAGE) {
    return null;
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      {shouldAnimate && showGlow ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              opacity: glow,
              width: size + 12,
              height: size + 12,
              borderRadius: (size + 12) / 2
            }
          ]}
        />
      ) : null}
      <Animated.Image
        source={LOGO_IMAGE}
        style={[
          styles.logo,
          { width: size, height: size },
          shouldAnimate ? { transform: [{ scale: breathe }] } : null
        ]}
        resizeMode="contain"
        accessibilityLabel="Clinic logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  glow: {
    backgroundColor: "rgba(45, 106, 79, 0.1)",
    position: "absolute"
  },
  logo: {
    aspectRatio: 1
  }
});
