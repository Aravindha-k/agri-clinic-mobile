import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StitchSectionHeader({ title, actionLabel, onAction }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: c.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  title: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  action: { fontSize: 13, fontWeight: "700" }
});
