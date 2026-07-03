import { StyleSheet, Text, View, type TextStyle } from "react-native";
import { BRAND } from "../../../src/config/brand";
import { Harvest, Typography } from "../../lib/designSystem";

type Props = {
  align?: "center" | "left";
  compact?: boolean;
  style?: TextStyle;
};

/** Stacked wordmark — Kavya / Agri Clinic as the brand hero. */
export function BrandTitle({ align = "center", compact = false, style }: Props) {
  const primary = (BRAND as { brandTitleLine1?: string }).brandTitleLine1 ?? "Kavya";
  const secondary = (BRAND as { brandTitleLine2?: string }).brandTitleLine2 ?? "Agri Clinic";
  const fullName = `${primary} ${secondary}`;

  if (compact) {
    return (
      <Text
        style={[styles.compact, align === "center" && styles.center, style]}
        numberOfLines={1}
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
      <Text style={[styles.line1, align === "center" && styles.center, style]} numberOfLines={1}>
        {primary}
      </Text>
      <Text style={[styles.line2, align === "center" && styles.center]} numberOfLines={1}>
        {secondary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    gap: 2,
    maxWidth: 320,
    paddingHorizontal: 4
  },
  lockupCenter: {
    alignItems: "center",
    alignSelf: "center"
  },
  line1: {
    ...Typography.heading,
    color: Harvest.forest,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 30
  },
  line2: {
    ...Typography.title,
    color: "#2D6A4F",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.15,
    lineHeight: 24
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
