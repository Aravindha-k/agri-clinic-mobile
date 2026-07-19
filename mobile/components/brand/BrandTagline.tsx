import { StyleSheet, Text, useWindowDimensions, type TextStyle } from "react-native";
import { BRAND } from "../../../src/config/brand";
import { Typography } from "../../lib/designSystem";

type Props = {
  align?: "center" | "left";
  style?: TextStyle;
  /** Today header tagline density. */
  density?: "default" | "today";
};

/** Brand tagline beneath the clinic name — from shared brand config. */
export function BrandTagline({ align = "center", style, density = "default" }: Props) {
  const { width } = useWindowDimensions();
  const tagline = (BRAND as { tagline?: string }).tagline ?? "Diagnostics • Solutions • Growth";
  const today = density === "today";
  const narrow = today && width < 360;

  return (
    <Text
      style={[
        styles.tagline,
        today && styles.taglineToday,
        narrow && styles.taglineTodayNarrow,
        align === "center" && styles.center,
        style
      ]}
      numberOfLines={2}
    >
      {tagline}
    </Text>
  );
}

const styles = StyleSheet.create({
  tagline: {
    ...Typography.caption,
    color: "#5A7A68",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    lineHeight: 16,
    textTransform: "none"
  },
  taglineToday: {
    letterSpacing: 0.4,
    lineHeight: 16
  },
  taglineTodayNarrow: {
    fontSize: 11,
    letterSpacing: 0.3,
    lineHeight: 15
  },
  center: {
    textAlign: "center"
  }
});
