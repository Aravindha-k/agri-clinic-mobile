import { StyleSheet, Text, useWindowDimensions, View, type TextStyle } from "react-native";
import { BRAND } from "../../../src/config/brand";
import { Harvest, Typography } from "../../lib/designSystem";

type Props = {
  align?: "center" | "left";
  compact?: boolean;
  style?: TextStyle;
  /** When false, titles do not use ellipsis (Today split). */
  truncate?: boolean;
  /** Today header premium lockup sizing. */
  density?: "default" | "today";
};

/** Stacked wordmark — Kavya / Agri Clinic as the brand hero. */
export function BrandTitle({
  align = "center",
  compact = false,
  style,
  truncate = true,
  density = "default"
}: Props) {
  const { width } = useWindowDimensions();
  const primary = (BRAND as { brandTitleLine1?: string }).brandTitleLine1 ?? "Kavya";
  const secondary = (BRAND as { brandTitleLine2?: string }).brandTitleLine2 ?? "Agri Clinic";
  const fullName = `${primary} ${secondary}`;
  const today = density === "today";
  const narrow = today && width < 360;

  if (compact) {
    return (
      <Text
        style={[styles.compact, align === "center" && styles.center, style]}
        numberOfLines={truncate ? 1 : 2}
        accessibilityRole="header"
      >
        {fullName}
      </Text>
    );
  }

  return (
    <View
      style={[styles.lockup, align === "center" && styles.lockupCenter]}
      accessibilityRole="header"
      accessibilityLabel={fullName}
    >
      <Text
        style={[
          styles.line1,
          today && styles.line1Today,
          narrow && styles.line1TodayNarrow,
          align === "center" && styles.center,
          style
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit={today}
        minimumFontScale={today ? 0.88 : undefined}
        ellipsizeMode={truncate ? "tail" : "clip"}
      >
        {primary}
      </Text>
      <Text
        style={[
          styles.line2,
          today && styles.line2Today,
          narrow && styles.line2TodayNarrow,
          align === "center" && styles.center
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit={today}
        minimumFontScale={today ? 0.88 : undefined}
        ellipsizeMode={truncate ? "tail" : "clip"}
      >
        {secondary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    gap: 2,
    maxWidth: "100%",
    paddingHorizontal: 0,
    width: "100%"
  },
  lockupCenter: {
    alignItems: "center",
    alignSelf: "center"
  },
  line1: {
    ...Typography.heading,
    color: Harvest.forest,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32
  },
  line1Today: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 34
  },
  line1TodayNarrow: {
    fontSize: 26,
    lineHeight: 30
  },
  line2: {
    ...Typography.title,
    color: "#0F6B43",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.12,
    lineHeight: 22
  },
  line2Today: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.1,
    lineHeight: 22
  },
  line2TodayNarrow: {
    fontSize: 16,
    lineHeight: 20
  },
  compact: {
    ...Typography.subtitle,
    fontSize: 17,
    fontWeight: "600"
  },
  center: {
    textAlign: "center"
  }
});
