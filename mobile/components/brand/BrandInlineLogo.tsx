import { Image, Platform, StyleSheet, View } from "react-native";
import { LOGO_IMAGE } from "../../../src/config/brand";
import { AgriNatureMark } from "./AgriNatureMark";
import {
  BRAND_LOGO_FILL,
  BRAND_LOGO_INLINE,
  BRAND_LOGO_INLINE_COVER
} from "./brandHeaderSpacing";

type Props = {
  size?: number;
};

/** Logo chip for compact screen title bars — Work, Day, Tracking, etc. */
export function BrandInlineLogo({ size = BRAND_LOGO_INLINE }: Props) {
  const logoCover = Math.round(size * BRAND_LOGO_FILL * BRAND_LOGO_INLINE_COVER);

  return (
    <View
      style={[
        styles.chip,
        { width: size, height: size, borderRadius: size / 2 },
        styles.chipShadow
      ]}
    >
      {LOGO_IMAGE ? (
        <Image
          source={LOGO_IMAGE}
          style={{ width: logoCover, height: logoCover }}
          resizeMode="cover"
          accessibilityLabel="Kavya Agri Clinic"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <AgriNatureMark size={Math.round(size * BRAND_LOGO_FILL)} variant="cluster" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    backgroundColor: "#F7FBF8",
    borderColor: "rgba(15, 107, 67, 0.22)",
    borderWidth: 1.5,
    flexShrink: 0,
    justifyContent: "center",
    overflow: "hidden"
  },
  chipShadow: Platform.select({
    ios: {
      shadowColor: "#0A3D28",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4
    },
    default: { elevation: 2 }
  })
});
