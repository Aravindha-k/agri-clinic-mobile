import { Pressable, StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "./brand/BrandLogo";
import { BRAND } from "../config/brand";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";

type Props = {
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
};

export function AppFallbackScreen({
  title,
  message,
  primaryLabel = "Try again",
  onPrimary,
  secondaryLabel,
  onSecondary,
  tertiaryLabel,
  onTertiary
}: Props) {
  return (
    <View style={styles.root}>
      <BrandLogo variant="default" width={72} height={72} />
      <Text style={styles.brand}>{BRAND.appName}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onPrimary ? (
        <Pressable accessibilityRole="button" onPress={onPrimary} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        </Pressable>
      ) : null}
      {onSecondary && secondaryLabel ? (
        <Pressable accessibilityRole="button" onPress={onSecondary} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
      {onTertiary && tertiaryLabel ? (
        <Pressable accessibilityRole="button" onPress={onTertiary} style={styles.tertiaryBtn}>
          <Text style={styles.tertiaryText}>{tertiaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: space.xl
  },
  brand: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: space.md,
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: space.lg,
    textAlign: "center"
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: space.sm,
    textAlign: "center"
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: space.xl,
    minWidth: 200,
    paddingHorizontal: 24,
    paddingVertical: 14
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  secondaryBtn: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: space.sm,
    minWidth: 200,
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  secondaryText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  tertiaryBtn: {
    marginTop: space.md,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tertiaryText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    textDecorationLine: "underline"
  }
});
