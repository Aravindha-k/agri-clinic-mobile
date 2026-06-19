import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BRAND, BRAND_COLORS, LOGO_IMAGE } from "../../config/brand";
import { LOGO_SIZES } from "../../brand/logoSizing";
import { useTheme } from "../../theme";

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
  const ringBg = onPrimary ? "rgba(255,255,255,0.18)" : c.primarySoft;
  const iconColor = onPrimary ? "#FFFFFF" : c.primaryDark;
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
  const ringPad =
    size === "xs" ? 8 : size === "sm" ? 12 : size === "lg" ? 14 : size === "xl" ? 12 : 16;

  const subline = BRAND.name === BRAND.appName ? BRAND.tagline : BRAND.name;
  const roundBareMark = bare && Boolean(LOGO_IMAGE);

  const mark = LOGO_IMAGE ? (
    <Image
      source={LOGO_IMAGE}
      style={
        roundBareMark
          ? { width: dim * 1.12, height: dim * 1.12 }
          : { width: dim, height: dim, aspectRatio: 1 }
      }
      resizeMode={roundBareMark ? "cover" : "contain"}
      accessibilityLabel="Clinic logo"
    />
  ) : (
    <Ionicons name="leaf" size={dim * 0.52} color={iconColor} />
  );

  return (
    <View style={[styles.wrap, horizontal && styles.wrapHorizontal, bare && styles.wrapBare, style]}>
      {bare ? (
        <View
          style={[
            styles.bareMark,
            roundBareMark && {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: onPrimary ? "#FFFFFF" : c.primarySoft,
              borderColor: onPrimary ? "rgba(255,255,255,0.45)" : BRAND_COLORS.primarySoftBorder,
              borderWidth: onPrimary ? 2 : StyleSheet.hairlineWidth,
              overflow: "hidden"
            }
          ]}
        >
          {mark}
        </View>
      ) : (
        <View style={[styles.ring, { width: dim + ringPad, height: dim + ringPad, backgroundColor: ringBg }]}>
          {mark}
        </View>
      )}
      {showWordmark ? (
        <View style={[styles.wordmark, horizontal && styles.wordmarkHorizontal, bare && styles.wordmarkBare]}>
          <Text
            style={[styles.name, { color: titleColor, fontSize: titleSize, textAlign: horizontal ? "left" : "left" }]}
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
                textAlign: horizontal ? "left" : "left"
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
    flexShrink: 0,
    justifyContent: "center"
  },
  wrapHorizontal: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    width: "100%"
  },
  ring: {
    alignItems: "center",
    borderRadius: 999,
    flexShrink: 0,
    justifyContent: "center"
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
