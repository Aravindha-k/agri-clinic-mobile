import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { BRAND_COLORS } from "../../config/brand";

const PARTICLE_COLOR = BRAND_COLORS.primary;

type ParticleSpec = {
  tx: number;
  ty: number;
  anim: Animated.Value;
};

function ParticleBurst() {
  const particles = useMemo<ParticleSpec[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const distance = 70 + (i % 3) * 8;
        return {
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance,
          anim: new Animated.Value(0)
        };
      }),
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.stagger(
        20,
        particles.map((p) =>
          Animated.timing(p.anim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true
          })
        )
      ).start();
    }, 900);
    return () => clearTimeout(timer);
  }, [particles]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => {
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.tx] });
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.ty] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.4, 0] });
        const scale = p.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              opacity,
              transform: [{ translateX }, { translateY }, { scale }]
            }}
          >
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: PARTICLE_COLOR }} />
          </Animated.View>
        );
      })}
    </View>
  );
}

function CropSilhouettes() {
  const grow = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.stagger(
        300,
        grow.map((v) => Animated.spring(v, { toValue: 1, speed: 8, bounciness: 6, useNativeDriver: true }))
      ).start();
    }, 500);
    return () => clearTimeout(timer);
  }, [grow]);

  const positions = ["18%", "50%", "82%"] as const;

  return (
    <View style={styles.cropRow} pointerEvents="none">
      {grow.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: positions[i],
            bottom: 0,
            opacity: 0.08,
            transform: [{ translateX: -20 }, { scaleY: v }]
          }}
        >
          <Svg width={40} height={80} viewBox="0 0 24 48">
            <Path d="M12 46V20M12 20C8 14 4 10 4 6C8 8 10 12 12 16C14 12 16 8 20 6C20 10 16 14 12 20Z" fill={BRAND_COLORS.primary} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

function BackgroundShimmer() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [shimmer]);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-400, 400] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transform: [{ translateX }, { rotate: "18deg" }] }]}
    >
      <View style={styles.shimmerBand} />
    </Animated.View>
  );
}

export function SplashExtraEffects() {
  return (
    <>
      <BackgroundShimmer />
      <CropSilhouettes />
      <ParticleBurst />
    </>
  );
}

const styles = StyleSheet.create({
  cropRow: {
    bottom: 0,
    height: 90,
    left: 0,
    position: "absolute",
    right: 0
  },
  shimmerBand: {
    backgroundColor: "rgba(255,255,255,0.03)",
    height: "140%",
    width: 180
  }
});
