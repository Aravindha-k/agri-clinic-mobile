import { Image, StyleSheet, View } from "react-native";
import { LOGO_IMAGE } from "../../../src/config/brand";
import { AgriNatureMark } from "./AgriNatureMark";
import { BRAND_LOGO_FILL, BRAND_LOGO_INLINE } from "./brandHeaderSpacing";
import { Colors } from "../../lib/theme";

type Props = {
  size?: number;
};

/** Tiny logo chip for compact screen title bars. */
export function BrandInlineLogo({ size = BRAND_LOGO_INLINE }: Props) {
  const logoSize = Math.round(size * BRAND_LOGO_FILL);

  return (
    <View style={[styles.chip, { width: size, height: size, borderRadius: size / 2 }]}>
      {LOGO_IMAGE ? (
        <Image
          source={LOGO_IMAGE}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <AgriNatureMark size={logoSize} variant="cluster" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    backgroundColor: "#F7FBF8",
    borderColor: "rgba(15, 107, 67, 0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden"
  }
});
