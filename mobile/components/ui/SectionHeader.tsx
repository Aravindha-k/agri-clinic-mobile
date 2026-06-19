import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight } from "../../lib/theme";

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
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  titleWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  accent: {
    backgroundColor: Colors.brand700,
    borderRadius: 2,
    height: 14,
    width: 3
  },
  title: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.06 * FontSize.sm,
    textTransform: "uppercase"
  },
  action: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  }
});
