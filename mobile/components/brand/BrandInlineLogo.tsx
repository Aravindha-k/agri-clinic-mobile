import { StyleSheet, View } from "react-native";
import { BRAND_LOGO_INLINE } from "./brandHeaderSpacing";
import { CompanyLogo } from "../../../src/components/brand/CompanyLogo";

type Props = {
  size?: number;
};

/** Compact header logo — canonical CompanyLogo only. */
export function BrandInlineLogo({ size = BRAND_LOGO_INLINE }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <CompanyLogo size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center"
  }
});
