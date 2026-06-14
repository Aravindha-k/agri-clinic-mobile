import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BRAND, LOGO_IMAGE } from "../../config/brand";
import { LOGO_SIZES } from "../../brand/logoSizing";
import { useTheme } from "../../theme";

export type BrandLogoVariant = "default" | "header" | "login" | "splash" | "watermark" | "onPrimary";

type VariantPreset = {
  width: number;
  height: number;
  plate?: boolean;
  plateSize?: number;
  opacity?: number;
  showTextDefault?: boolean;
};

const VARIANT_PRESETS: Record<BrandLogoVariant, VariantPreset> = {
  default: { width: LOGO_SIZES.appLogo.md, height: LOGO_SIZES.appLogo.md },
  header: { width: LOGO_SIZES.homeHeader, height: LOGO_SIZES.homeHeader },
  login: {
    width: LOGO_SIZES.loginMark,
    height: LOGO_SIZES.loginMark,
    plate: true,
    plateSize: LOGO_SIZES.loginPlate
  },
  splash: {
    width: LOGO_SIZES.splash - 28,
    height: LOGO_SIZES.splash - 28,
    plate: true,
    plateSize: LOGO_SIZES.splash
  },
  watermark: {
    width: LOGO_SIZES.appLogo.xs,
    height: LOGO_SIZES.appLogo.xs,
    opacity: 0.88
  },
  onPrimary: { width: LOGO_SIZES.appLogo.xl, height: LOGO_SIZES.appLogo.xl }
};

/** @deprecated Prefer `variant` presets */
export type BrandLogoSize = keyof typeof LOGO_SIZES.appLogo;

type Props = {
  width?: number;
  height?: number;
  showText?: boolean;
  variant?: BrandLogoVariant;
  /** @deprecated Use `variant` or explicit width/height */
  size?: BrandLogoSize;
  style?: ViewStyle;
};

export function BrandLogo({
  width,
  height,
  showText = false,
  variant = "default",
  size,
  style
}: Props) {
  const { theme } = useTheme();
  const preset = VARIANT_PRESETS[variant];
  const legacySize = size ? LOGO_SIZES.appLogo[size] : undefined;
  const markW = width ?? legacySize ?? preset.width;
  const markH = height ?? legacySize ?? preset.height;
  const onPrimary = variant === "onPrimary";
  const iconColor = onPrimary ? "#FFFFFF" : theme.colors.primaryDark;

  const mark = LOGO_IMAGE ? (
    <Image
      source={LOGO_IMAGE as number}
      style={{ width: markW, height: markH, aspectRatio: 1, opacity: preset.opacity }}
      resizeMode="contain"
      accessibilityLabel="Clinic logo"
    />
  ) : (
    <Ionicons name="leaf" size={markW * 0.52} color={iconColor} />
  );

  const logoBody = preset.plate ? (
    <View style={[styles.plate, preset.plateSize != null && { width: preset.plateSize, height: preset.plateSize }]}>
      {mark}
    </View>
  ) : (
    mark
  );

  return (
    <View style={[styles.wrap, style]}>
      {logoBody}
      {showText ? (
        <View style={styles.textBlock}>
          <Text style={[styles.appName, { color: theme.colors.primaryDark }]} numberOfLines={2}>
            {BRAND.appName}
          </Text>
          <Text style={[styles.tagline, { color: theme.colors.muted }]} numberOfLines={2}>
            {BRAND.tagline}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  plate: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    justifyContent: "center"
  },
  textBlock: { alignItems: "center", marginTop: 12, maxWidth: 280 },
  appName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.35, textAlign: "center" },
  tagline: { fontSize: 13, fontWeight: "600", lineHeight: 18, marginTop: 4, textAlign: "center" }
});
