import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { LOGO_SIZES } from "../../brand/logoSizing";
import { BRAND_COLORS, LOGO_IMAGE } from "../../config/brand";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Props = {
  size?: number;
  style?: ViewStyle;
  /** Stronger pulse for full-page data loading. */
  loading?: boolean;
};

/**
 * Logo pulse loader — reliable on all devices (PNG), used for page data loading.
 */
export function AppLoadingLogo({
  size = LOGO_SIZES.appLogo.xl,
  style,
  loading = false
}: Props) {
  const breathe = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0.92)).current;
  const ringOpacity = useRef(new Animated.Value(0.45)).current;
  const { reduced } = usePremiumMotion();
  const shouldAnimate = !reduced && (Boolean(LOGO_IMAGE) || loading);

  useEffect(() => {
    if (!shouldAnimate) {
      breathe.setValue(1);
      ring.setValue(1);
      ringOpacity.setValue(0.4);
      return;
    }

    const pulseHigh = loading ? 1.14 : 1.1;
    const pulseLow = loading ? 0.88 : 0.92;
    const duration = loading ? 1100 : 1400;

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: pulseHigh,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(breathe, {
          toValue: pulseLow,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring, { toValue: 1.08, duration, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.75, duration, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(ring, { toValue: 0.92, duration, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.35, duration, useNativeDriver: true })
        ])
      ])
    );

    breatheLoop.start();
    ringLoop.start();
    return () => {
      breatheLoop.stop();
      ringLoop.stop();
    };
  }, [breathe, loading, ring, ringOpacity, shouldAnimate]);

  const plate = size + (loading ? 28 : 14);

  return (
    <View style={[styles.wrap, { width: plate, height: plate }, style]}>
      {shouldAnimate ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              opacity: ringOpacity,
              width: plate,
              height: plate,
              borderRadius: plate / 2,
              transform: [{ scale: ring }]
            }
          ]}
        />
      ) : null}
      <View style={[styles.plate, loading && styles.plateLoading, { width: plate - 8, height: plate - 8, borderRadius: (plate - 8) / 2 }]}>
        {LOGO_IMAGE ? (
          <Animated.Image
            source={LOGO_IMAGE}
            style={[
              styles.logo,
              { width: size, height: size },
              shouldAnimate ? { transform: [{ scale: breathe }] } : null
            ]}
            resizeMode="contain"
            accessibilityLabel="Loading"
          />
        ) : (
          <Animated.View style={shouldAnimate ? { transform: [{ scale: breathe }] } : undefined}>
            <Ionicons name="leaf" size={size * 0.55} color={BRAND_COLORS.primary} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  ring: {
    backgroundColor: "rgba(15, 107, 67, 0.12)",
    position: "absolute"
  },
  plate: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    justifyContent: "center"
  },
  plateLoading: {
    borderColor: "rgba(15, 107, 67, 0.1)",
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#0F6B43",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12
  },
  logo: {
    aspectRatio: 1
  }
});
