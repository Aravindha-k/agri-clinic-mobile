import { useEffect } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { CompanyLogo } from "../brand/CompanyLogo";
import { FONTS } from "../../theme/fonts";
import { Colors, Spacing } from "../../../mobile/lib/theme";

/**
 * Field atmosphere only — leaf/field photo with no baked UI.
 * Do not require login_field_hero.jpg (full mockup = ghost second login).
 */
export const LOGIN_FIELD_BG = require("../../../assets/login/login_field_bg.jpg");

/** Space for login card overlap below the header. */
export const LOGIN_HEADER_OVERLAP = 28;

const LOGO_SIZE = 104;

const FEATURES: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { icon: "cloud-offline-outline", label: "Works offline" },
  { icon: "location-outline", label: "GPS enabled" },
  { icon: "stats-chart-outline", label: "Field visit tracking" }
];

type Props = {
  topInset: number;
};

/**
 * Login hero — field photo atmosphere + live CompanyLogo / copy (single login UI).
 */
export function LoginHeroHeader({ topInset }: Props) {
  const { height: screenH, width: screenW } = useWindowDimensions();
  const headerHeight = Math.max(248, Math.round(screenH * 0.36));
  const logoScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [logoScale]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }]
  }));

  // Top-align field band (avoid cover-centering into any residual mid-frame).
  const bgHeight = Math.max(headerHeight, Math.round(screenW * (480 / 472)));

  return (
    <View style={[styles.shell, { height: headerHeight }]}>
      <Image
        source={LOGIN_FIELD_BG}
        style={[styles.bgImage, { width: screenW, height: bgHeight }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={["rgba(248,247,242,0.25)", "rgba(248,247,242,0.55)", "rgba(248,247,242,0.88)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={[styles.content, { paddingTop: topInset + Spacing.sm }]}>
        <Reanimated.View style={[styles.logoWrap, logoAnimStyle]}>
          <CompanyLogo size={LOGO_SIZE} />
        </Reanimated.View>

        <Text style={styles.greeting}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue your field work</Text>

        <View style={styles.featureRow}>
          {FEATURES.map((item) => (
            <View key={item.label} style={styles.featureItem}>
              <Ionicons name={item.icon} size={16} color={Colors.brand700} />
              <Text style={styles.featureLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: Colors.brand50,
    overflow: "hidden",
    width: "100%"
  },
  bgImage: {
    left: 0,
    position: "absolute",
    top: 0
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: LOGIN_HEADER_OVERLAP + Spacing.sm,
    paddingHorizontal: Spacing.screen
  },
  logoWrap: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
    marginBottom: Spacing.md
  },
  greeting: {
    color: Colors.brand700,
    fontFamily: FONTS.bold,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center"
  },
  subtitle: {
    color: Colors.text2,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    paddingHorizontal: Spacing.md,
    textAlign: "center"
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm
  },
  featureItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  featureLabel: {
    color: Colors.brand700,
    fontFamily: FONTS.medium,
    fontSize: 11
  }
});
