import { StyleSheet, View } from "react-native";
import { BrandSubtitle, BrandTitle } from "../brand";

type Props = {
  align?: "center" | "left";
};

/** @deprecated Use `BrandTitle` + `BrandSubtitle` from `../brand`. */
export function PremiumBrandWordmark({ align = "center" }: Props) {
  const centered = align === "center";

  return (
    <View style={[styles.wrap, centered && styles.wrapCenter]}>
      <BrandTitle align={align} />
      <BrandSubtitle align={align} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    minWidth: 0
  },
  wrapCenter: {
    alignItems: "center"
  }
});
