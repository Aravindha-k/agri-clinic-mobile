import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { BRAND_COLORS } from "../../config/brand";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

type Particle = {
  id: number;
  angle: number;
  distance: number;
  size: number;
};

type Props = {
  active?: boolean;
};

function BurstParticle({ particle, enabled }: { particle: Particle; enabled: boolean }) {
  const opacity = useRef(new Animated.Value(0.9)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) return;
    const tx = Math.cos(particle.angle) * particle.distance;
    const ty = Math.sin(particle.angle) * particle.distance;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: tx, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: ty, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.3, duration: 900, useNativeDriver: true })
    ]).start();
  }, [enabled, opacity, particle.angle, particle.distance, scale, translateX, translateY]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }]
        }
      ]}
    />
  );
}

export function SuccessParticleBurst({ active = true }: Props) {
  const { enabled } = usePremiumMotion();
  const [visible, setVisible] = useState(active && enabled);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * Math.PI * 2,
      distance: 28 + (i % 4) * 10,
      size: 4 + (i % 3)
    }));
  }, []);

  useEffect(() => {
    if (!active || !enabled) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1000);
    return () => clearTimeout(t);
  }, [active, enabled]);

  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      {particles.map((p) => (
        <BurstParticle key={p.id} particle={p} enabled={enabled} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  dot: {
    backgroundColor: BRAND_COLORS.primary,
    position: "absolute"
  }
});
