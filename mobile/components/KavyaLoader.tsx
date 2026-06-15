import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LOGO_IMAGE, BRAND_COLORS } from "../../src/config/brand";
import { FONTS } from "../../src/theme/fonts";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MESSAGES = ["Loading…", "Please wait…", "Syncing data…", "Almost ready…"];
const CIRCUMFERENCE = 239;
const RING_R = 38;
const RING_SIZE = 88;

export function KavyaLoader() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const dashOffset = useRef(new Animated.Value(CIRCUMFERENCE)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.07, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 900, useNativeDriver: true })
        ])
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dashOffset, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        }),
        Animated.timing(dashOffset, {
          toValue: CIRCUMFERENCE,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        })
      ])
    ).start();

    const dotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true })
        ])
      );

    dotAnim(dot1, 0).start();
    dotAnim(dot2, 200).start();
    dotAnim(dot3, 400).start();

    const interval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, 900);

    return () => clearInterval(interval);
  }, [dashOffset, dot1, dot2, dot3, opacity, rotation, scale, textOpacity]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ scale }, { rotate: spin }], opacity }}>
        <View style={styles.ringBox}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={BRAND_COLORS.primary}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.logoCircle}>
            {LOGO_IMAGE ? (
              <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Animated.View>

      <View style={styles.dots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot, backgroundColor: BRAND_COLORS.primary }]} />
        ))}
      </View>

      <Animated.Text style={[styles.message, { opacity: textOpacity }]}>{MESSAGES[msgIndex]}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 48
  },
  ringBox: {
    alignItems: "center",
    height: RING_SIZE,
    justifyContent: "center",
    width: RING_SIZE
  },
  logoCircle: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  logo: {
    height: 36,
    width: 36
  },
  dots: {
    flexDirection: "row",
    gap: 6
  },
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6
  },
  message: {
    color: "#94a3b8",
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500"
  }
});
