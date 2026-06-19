import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { AppLoadingLogo } from "../brand/AppLoadingLogo";
import { LOGO_SIZES } from "../../brand/logoSizing";

type Props = {
  refreshing: boolean;
};

export function LogoRefreshIndicator({ refreshing }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (refreshing) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(lift, { toValue: 6, duration: 200, useNativeDriver: true })
    ]).start();
  }, [lift, opacity, refreshing]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity, transform: [{ translateY: lift }] }]}
    >
      <View style={styles.plate}>
        <AppLoadingLogo size={LOGO_SIZES.appLogo.sm} loading />
      </View>
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
  plate: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "rgba(15, 107, 67, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  }
});
