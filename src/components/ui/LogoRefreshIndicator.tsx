import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { LOGO_IMAGE } from "../../config/brand";

type Props = {
  refreshing: boolean;
};

export function LogoRefreshIndicator({ refreshing }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (refreshing) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      loopRef.current = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
      );
      loopRef.current.start();
      return;
    }

    loopRef.current?.stop();
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    spin.setValue(0);
  }, [opacity, refreshing, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  if (!LOGO_IMAGE) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 8,
    zIndex: 10
  },
  logo: {
    borderRadius: 8,
    height: 28,
    width: 28
  }
});
