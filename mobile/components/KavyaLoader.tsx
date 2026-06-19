import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { AppLoadingLogo } from "../../src/components/brand/AppLoadingLogo";
import { LOGO_SIZES } from "../../src/brand/logoSizing";
import { BRAND, BRAND_COLORS } from "../../src/config/brand";
import { Colors } from "../lib/theme";
import { FONTS } from "../../src/theme/fonts";

const MESSAGES = ["Loading…", "Preparing your field day…", "Syncing records…", "Almost ready…"];

type Props = {
  fullScreen?: boolean;
  compact?: boolean;
  message?: string;
  style?: ViewStyle;
};

function LoadingDots() {
  const a = useRef(new Animated.Value(0.35)).current;
  const b = useRef(new Animated.Value(0.35)).current;
  const c = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.35, duration: 420, useNativeDriver: true }),
          Animated.delay(840 - delay)
        ])
      );

    const l1 = pulse(a, 0);
    const l2 = pulse(b, 140);
    const l3 = pulse(c, 280);
    l1.start();
    l2.start();
    l3.start();
    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [a, b, c]);

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, { opacity: a }]} />
      <Animated.View style={[styles.dot, { opacity: b }]} />
      <Animated.View style={[styles.dot, { opacity: c }]} />
    </View>
  );
}

/** App data loader — animated logo pulse (reliable on all devices). */
export function KavyaLoader({ fullScreen = false, compact = false, message, style }: Props) {
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [msgIndex, setMsgIndex] = useState(0);
  const showRotatingMessage = !compact && !message;
  const logoSize = compact ? LOGO_SIZES.appLogo.md : LOGO_SIZES.appLogo.xl;

  useEffect(() => {
    if (!showRotatingMessage) return;
    const interval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [showRotatingMessage, textOpacity]);

  const label = message ?? MESSAGES[msgIndex];

  return (
    <View style={[styles.wrap, fullScreen && styles.wrapFull, compact && styles.wrapCompact, style]}>
      <AppLoadingLogo size={logoSize} loading={!compact} />
      {!compact ? (
        <>
          <Text style={styles.appName} numberOfLines={1}>
            {BRAND.appName}
          </Text>
          {showRotatingMessage ? (
            <Animated.Text style={[styles.message, { opacity: textOpacity }]}>{label}</Animated.Text>
          ) : (
            <Text style={styles.message}>{label}</Text>
          )}
          <LoadingDots />
        </>
      ) : message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32
  },
  wrapCompact: {
    gap: 10,
    paddingVertical: 20
  },
  wrapFull: {
    flex: 1,
    paddingVertical: 0
  },
  appName: {
    color: Colors.text1,
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 4
  },
  message: {
    color: Colors.text3,
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center"
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2
  },
  dot: {
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 3,
    height: 6,
    width: 6
  }
});
