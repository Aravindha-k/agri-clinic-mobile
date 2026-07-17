import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { CompanyLogoMark } from "../../../src/components/brand/CompanyLogoMark";
import { Colors, Enterprise, Shadow, Spacing, TextStyles } from "../../lib/theme";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: ViewStyle;
  /** Prefer company logo for branded empty states. */
  showBrandLogo?: boolean;
};

export function EmptyState({
  icon = "leaf-outline",
  title,
  subtitle,
  action,
  onAction,
  compact,
  style,
  showBrandLogo = false
}: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      {showBrandLogo ? (
        <View style={styles.logoWrap}>
          <CompanyLogoMark size={compact ? 56 : 72} />
        </View>
      ) : (
        <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
          <Ionicons name={icon} size={compact ? 36 : 44} color={Colors.brand700} />
        </View>
      )}
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
  logoWrap: {
    marginBottom: Spacing.lg
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
    ...TextStyles.h3,
    color: Colors.text1,
    textAlign: "center"
  },
  titleCompact: {
    ...TextStyles.body
  },
  subtitle: {
    ...TextStyles.body,
    color: Colors.text3,
    marginTop: Spacing.sm,
    maxWidth: 300,
    textAlign: "center"
  },
  action: {
    marginTop: Spacing.xl,
    minWidth: 200
  }
});
