import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius } from "../../lib/theme";
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
      <View style={[styles.iconWrap, { backgroundColor: Colors.brand100, borderRadius: Radius.xxl }]}>
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
    paddingHorizontal: 24,
    paddingVertical: 32
  },
  iconWrap: {
    alignItems: "center",
    height: 80,
    justifyContent: "center",
    marginBottom: 16,
    width: 80
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    textAlign: "center"
  },
  subtitle: {
    fontSize: FontSize.base,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center"
  },
  action: {
    marginTop: 20,
    minWidth: 180
  }
});
