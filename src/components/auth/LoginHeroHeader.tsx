import { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { CompanyLogoMark } from "../brand/CompanyLogoMark";
import { FONTS } from "../../theme/fonts";
import { Colors, Spacing } from "../../../mobile/lib/theme";

/** Space for login card overlap below the header. */
export const LOGIN_HEADER_OVERLAP = 24;

const LOGO_SIZE = 104;

type Props = {
  topInset: number;
};

/** Clean login header with circular company logo — no white plate. */
export function LoginHeroHeader({ topInset }: Props) {
  const { height: screenH } = useWindowDimensions();
  const headerHeight = Math.max(220, Math.round(screenH * 0.28));
  const logoScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [logoScale]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }]
  }));

  return (
    <View style={[styles.shell, { height: headerHeight, paddingTop: topInset + Spacing.lg }]}>
      <View style={styles.content}>
        <Reanimated.View style={[styles.logoWrap, logoAnimStyle]}>
          <CompanyLogoMark size={LOGO_SIZE} />
        </Reanimated.View>

        <Text style={styles.greeting}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue your field work</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: Colors.bg,
    overflow: "hidden",
    width: "100%"
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
    justifyContent: "center",
    marginBottom: Spacing.lg
  },
  greeting: {
    color: Colors.text1,
    fontFamily: FONTS.bold,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center"
  },
  subtitle: {
    color: Colors.text3,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    paddingHorizontal: Spacing.md,
    textAlign: "center"
  }
});
