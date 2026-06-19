import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from "../../lib/theme";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, subtitle, action, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: Colors.brand50 }]}>
        <Ionicons name={icon} size={48} color={Colors.brand700} />
      </View>
      <Text style={[styles.title, { color: Colors.text1 }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: Colors.text3 }]}>{subtitle}</Text> : null}
      {action && onAction ? (
        <PrimaryButton label={action} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 40
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand100,
    borderRadius: Radius.card,
    borderWidth: 1,
    height: 84,
    justifyContent: "center",
    marginBottom: Spacing.lg,
    width: 84,
    ...Shadow.card
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    textAlign: "center"
  },
  subtitle: {
    fontSize: FontSize.base,
    lineHeight: 21,
    marginTop: Spacing.sm,
    maxWidth: 280,
    textAlign: "center"
  },
  action: {
    marginTop: Spacing.xl,
    minWidth: 200
  }
});
