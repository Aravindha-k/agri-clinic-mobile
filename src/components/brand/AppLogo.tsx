import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { BRAND } from "../../config/brand";
import { LOGO_SIZES } from "../../brand/logoSizing";
import { useTheme } from "../../theme";
import { CompanyLogo } from "./CompanyLogo";

const SIZES = LOGO_SIZES.appLogo;
export type AppLogoSize = keyof typeof SIZES;

type Props = {
  size?: AppLogoSize;
  showWordmark?: boolean;
  layout?: "vertical" | "horizontal";
  variant?: "light" | "dark" | "onPrimary";
  /** Smaller title/tag beside the logo mark (home header). */
  compactWordmark?: boolean;
  /** Show logo image only — no circular background (home header). */
  bare?: boolean;
  style?: ViewStyle;
};

export function AppLogo({
  size = "md",
  showWordmark = false,
  layout = "vertical",
  variant = "dark",
  compactWordmark = false,
  bare = false,
  style
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const dim = SIZES[size];
  const horizontal = layout === "horizontal";
  const onPrimary = variant === "onPrimary" || variant === "light";
  const titleColor = onPrimary ? "#FFFFFF" : c.primaryDark;
  const subColor = onPrimary ? "rgba(255,255,255,0.82)" : c.muted;
  const titleSize = compactWordmark && horizontal
    ? size === "xl"
      ? 16
      : size === "lg"
        ? 14
        : size === "md"
          ? 12
          : 11
    : horizontal
      ? size === "xs"
        ? 13
        : size === "sm"
          ? 14
          : size === "md"
            ? 16
            : 18
      : size === "xl"
        ? 20
        : 15;
  const tagSize =
    compactWordmark && horizontal
      ? size === "lg" || size === "xl"
        ? 10
        : 9
      : horizontal && size === "xs"
        ? 10
        : 11;

  const subline = BRAND.name === BRAND.appName ? BRAND.tagline : BRAND.name;
  const mark = <CompanyLogo size={dim} accessibilityLabel="Clinic logo" />;

  return (
    <View style={[styles.wrap, horizontal && styles.wrapHorizontal, bare && styles.wrapBare, style]}>
      <View style={styles.bareMark}>{mark}</View>
      {showWordmark ? (
        <View style={[styles.wordmark, horizontal && styles.wordmarkHorizontal, bare && styles.wordmarkBare]}>
          <Text
            style={[styles.name, { color: titleColor, fontSize: titleSize, textAlign: "left" }]}
            numberOfLines={2}
          >
            {BRAND.appName}
          </Text>
          <Text
            style={[
              styles.tag,
              {
                color: subColor,
                fontSize: tagSize,
                lineHeight: compactWordmark && horizontal ? 12 : 14,
                marginTop: compactWordmark && horizontal ? 1 : 3,
                textAlign: "left"
              }
            ]}
            numberOfLines={2}
          >
            {horizontal ? BRAND.tagline : subline}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  wrapBare: {
    alignItems: "flex-start",
    width: "100%"
  },
  bareMark: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexShrink: 0,
    justifyContent: "center"
  },
  wrapHorizontal: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    width: "100%"
  },
  wordmark: { alignItems: "center", marginTop: 12, maxWidth: 280 },
  wordmarkBare: {
    alignItems: "flex-start",
    marginTop: 8,
    maxWidth: 200
  },
  wordmarkHorizontal: {
    alignItems: "flex-start",
    flex: 1,
    justifyContent: "center",
    marginTop: 0,
    minWidth: 0
  },
  name: { fontWeight: "900", letterSpacing: -0.3, textAlign: "center" },
  tag: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.1,
    lineHeight: 15,
    marginTop: 2,
    textAlign: "center"
  }
});
