import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/layout";

type Tone = "success" | "warning" | "neutral" | "info";

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  neutral: { bg: colors.border, fg: colors.muted },
  info: { bg: colors.primarySoft, fg: colors.primaryDark }
};

export function StatusChip({ label = "Open", tone = "success" }: { label?: string; tone?: Tone }) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  text: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2
  }
});
