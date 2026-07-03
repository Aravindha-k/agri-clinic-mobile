import { StyleSheet, Text, type TextStyle } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Colors } from "../../lib/theme";

type Props = {
  align?: "center" | "left";
  compact?: boolean;
  style?: TextStyle;
};

/** Refined platform subtitle beneath the brand title. */
export function BrandSubtitle({ align = "center", compact = false, style }: Props) {
  const { t } = useI18n();
  const label = t("brand.platformSubtitle");

  return (
    <Text
      style={[
        styles.subtitle,
        compact && styles.subtitleCompact,
        align === "center" && styles.center,
        style
      ]}
      numberOfLines={2}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: Colors.text2,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.25,
    lineHeight: 21,
    opacity: 0.78
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 19
  },
  center: {
    textAlign: "center"
  }
});
