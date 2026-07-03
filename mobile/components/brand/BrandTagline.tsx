import { StyleSheet, Text, type TextStyle } from "react-native";
import { BRAND } from "../../../src/config/brand";
import { Harvest, Typography } from "../../lib/designSystem";

type Props = {
  align?: "center" | "left";
  style?: TextStyle;
};

/** Brand tagline beneath the clinic name — from shared brand config. */
export function BrandTagline({ align = "center", style }: Props) {
  const tagline = (BRAND as { tagline?: string }).tagline ?? "Diagnostics • Solutions • Growth";

  return (
    <Text style={[styles.tagline, align === "center" && styles.center, style]} numberOfLines={2}>
      {tagline}
    </Text>
  );
}

const styles = StyleSheet.create({
  tagline: {
    ...Typography.caption,
    color: Harvest.textMuted,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.15,
    lineHeight: 18,
    textTransform: "none"
  },
  center: {
    textAlign: "center"
  }
});
