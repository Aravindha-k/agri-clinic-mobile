import { StyleSheet, Text, View } from "react-native";
import { Typography } from "../../lib/designSystem";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

type Props = {
  title: string;
  action?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, action, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <View style={styles.accent} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {action && onAction ? (
        <Text onPress={onAction} style={styles.action} accessibilityRole="button">
          {action}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs
  },
  titleWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm
  },
  accent: {
    backgroundColor: Colors.brand700,
    borderRadius: 2,
    height: 16,
    width: 3
  },
  title: {
    ...Typography.label,
    fontSize: 12,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.55,
    textTransform: "uppercase"
  },
  action: {
    color: Colors.brand700,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold
  }
});
