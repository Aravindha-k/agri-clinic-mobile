import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius } from "../../lib/theme";

type Variant = "green" | "amber" | "red" | "blue" | "gray" | "purple";

const VARIANT_STYLES: Record<Variant, { bg: string; text: string }> = {
  green: { bg: Colors.greenBg, text: Colors.greenText },
  amber: { bg: Colors.amberBg, text: Colors.amberText },
  red: { bg: Colors.redBg, text: Colors.redText },
  blue: { bg: Colors.blueBg, text: Colors.blueText },
  gray: { bg: Colors.brand50, text: Colors.text3 },
  purple: { bg: Colors.purpleBg, text: Colors.purpleText }
};

type Props = {
  label: string;
  variant: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function StatusChip({ label, variant, icon }: Props) {
  const tone = VARIANT_STYLES[variant];

  return (
    <View style={[styles.chip, { backgroundColor: tone.bg, borderRadius: Radius.sm }]}>
      {icon ? <Ionicons name={icon} size={12} color={tone.text} /> : null}
      <Text style={[styles.text, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  }
});
