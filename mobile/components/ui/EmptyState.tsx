import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Colors, Enterprise, FontSize, FontWeight, Layout, Radius, Shadow, Spacing } from "../../lib/theme";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: ViewStyle;
};

export function EmptyState({ icon, title, subtitle, action, onAction, compact, style }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
        <Ionicons name={icon} size={compact ? 36 : 44} color={Colors.brand700} />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action && onAction ? (
        <PrimaryButton label={action} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: Spacing.xxl
  },
  wrapCompact: {
    paddingHorizontal: Spacing.lg
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderColor: Colors.border,
    borderRadius: Enterprise.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    height: 80,
    justifyContent: "center",
    marginBottom: Spacing.lg,
    width: 80,
    ...Shadow.card
  },
  iconWrapCompact: {
    height: 64,
    marginBottom: Spacing.md,
    width: 64
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.section,
    fontWeight: FontWeight.semibold,
    textAlign: "center"
  },
  titleCompact: {
    fontSize: FontSize.body
  },
  subtitle: {
    color: Colors.text3,
    fontSize: FontSize.body,
    lineHeight: 22,
    marginTop: Spacing.sm,
    maxWidth: 300,
    textAlign: "center"
  },
  action: {
    marginTop: Spacing.xl,
    minWidth: 200
  }
});
