import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";
import { LOGO_SIZES } from "../../src/brand/logoSizing";
import { BRAND, LOGO_IMAGE, BRAND_COLORS } from "../../src/config/brand";
import { Colors } from "../lib/theme";
import { FONTS } from "../../src/theme/fonts";

const LOGO_DIM = LOGO_SIZES.homeHeader;
const MESSAGES = ["Loading…", "Preparing your field day…", "Syncing records…", "Almost ready…"];

type Props = {
  fullScreen?: boolean;
  style?: ViewStyle;
};

export function KavyaLoader({ fullScreen = false, style }: Props) {
  const seedPulse = useRef(new Animated.Value(1)).current;
  const sproutGrow = useRef(new Animated.Value(0)).current;
  const sproutSway = useRef(new Animated.Value(0)).current;
  const soilGlow = useRef(new Animated.Value(0.35)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(seedPulse, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(seedPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sproutGrow, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(sproutGrow, { toValue: 0.15, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sproutSway, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sproutSway, { toValue: -1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(soilGlow, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
        Animated.timing(soilGlow, { toValue: 0.35, duration: 1200, useNativeDriver: true })
      ])
    ).start();

    const interval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [seedPulse, soilGlow, sproutGrow, sproutSway, textOpacity]);

  const sproutScale = sproutGrow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const sproutRotate = sproutSway.interpolate({ inputRange: [-1, 1], outputRange: ["-8deg", "8deg"] });

  return (
    <View style={[styles.wrap, fullScreen && styles.wrapFull, style]}>
      {LOGO_IMAGE ? (
        <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" accessibilityLabel="Clinic logo" />
      ) : null}

      <Text style={styles.appName} numberOfLines={1}>
        {BRAND.appName}
      </Text>

      <View style={styles.seedStage}>
        <Animated.View style={[styles.soilRing, { opacity: soilGlow }]} />
        <Animated.View style={{ transform: [{ scale: seedPulse }] }}>
          <Svg width={72} height={56} viewBox="0 0 72 56">
            <Ellipse cx={36} cy={38} rx={22} ry={14} fill="#8B6914" opacity={0.92} />
            <Ellipse cx={36} cy={36} rx={20} ry={12} fill="#A67C00" />
            <Ellipse cx={30} cy={34} rx={6} ry={3} fill="#C9A227" opacity={0.45} />
          </Svg>
        </Animated.View>
        <Animated.View
          style={[
            styles.sprout,
            {
              opacity: sproutGrow,
              transform: [{ scaleY: sproutScale }, { rotate: sproutRotate }]
            }
          ]}
        >
          <Svg width={40} height={48} viewBox="0 0 40 48">
            <Path d="M20 44V22" stroke={BRAND_COLORS.primary} strokeWidth={2.5} strokeLinecap="round" />
            <Path
              d="M20 26C14 22 8 18 6 12C12 16 17 20 20 26Z"
              fill={BRAND_COLORS.primary}
              opacity={0.9}
            />
            <Path
              d="M20 20C26 16 32 12 34 8C28 14 23 17 20 20Z"
              fill={BRAND_COLORS.secondary}
              opacity={0.85}
            />
          </Svg>
        </Animated.View>
      </View>

      <Animated.Text style={[styles.message, { opacity: textOpacity }]}>{MESSAGES[msgIndex]}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40
  },
  wrapFull: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 0
  },
  logo: {
    height: LOGO_DIM,
    width: LOGO_DIM
  },
  appName: {
    color: Colors.text1,
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 4
  },
  seedStage: {
    alignItems: "center",
    height: 88,
    justifyContent: "flex-end",
    marginTop: 8,
    width: 88
  },
  soilRing: {
    backgroundColor: BRAND_COLORS.primarySoft,
    borderRadius: 44,
    bottom: 0,
    height: 72,
    position: "absolute",
    width: 72
  },
  sprout: {
    bottom: 18,
    position: "absolute"
  },
  message: {
    color: Colors.text3,
    fontFamily: FONTS.medium,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4
  }
});
