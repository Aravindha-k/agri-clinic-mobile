import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { BRAND } from "../../config/brand";
import { LOGO_SIZES } from "../../brand/logoSizing";
import { useTheme } from "../../theme";
import { CompanyLogo } from "./CompanyLogo";

export type BrandLogoVariant = "default" | "header" | "login" | "splash" | "watermark" | "onPrimary";

type VariantPreset = {
  size: number;
  opacity?: number;
};

const VARIANT_PRESETS: Record<BrandLogoVariant, VariantPreset> = {
  default: { size: LOGO_SIZES.appLogo.md },
  header: { size: LOGO_SIZES.homeHeader },
  login: { size: LOGO_SIZES.loginMark },
  splash: { size: LOGO_SIZES.splash },
  watermark: { size: LOGO_SIZES.appLogo.xs, opacity: 0.88 },
  onPrimary: { size: LOGO_SIZES.appLogo.xl }
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
  const markSize = width ?? height ?? legacySize ?? preset.size;

  return (
    <View style={[styles.wrap, style, preset.opacity != null && { opacity: preset.opacity }]}>
      <CompanyLogo size={markSize} />
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
  textBlock: { alignItems: "center", marginTop: 12, maxWidth: 280 },
  appName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.35, textAlign: "center" },
  tagline: { fontSize: 13, fontWeight: "600", lineHeight: 18, marginTop: 4, textAlign: "center" }
});
