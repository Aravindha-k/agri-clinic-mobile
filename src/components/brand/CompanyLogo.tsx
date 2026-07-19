import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LOGO_IMAGE } from "../../config/brand";

export type CompanyLogoProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Single in-app company logo.
 * Asset: assets/brand/logo_circle_transparent.png
 * Never stretch, crop, or place a white square behind the mark.
 */
export function CompanyLogo({
  size = 72,
  style,
  accessibilityLabel = "Kavya Agri Clinic logo"
}: CompanyLogoProps) {
  if (!LOGO_IMAGE) {
    return <View style={[{ width: size, height: size }, style]} />;
  }

  return (
    <View
      style={[
        styles.shell,
        { width: size, height: size, borderRadius: size / 2 },
        style
      ]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={LOGO_IMAGE}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

/** @deprecated Use `CompanyLogo` — same component. */
export const CompanyLogoMark = CompanyLogo;

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
    overflow: "hidden"
  }
});
