import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BRAND, LOGO_IMAGE } from "../brand/constants";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";

type Props = {
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function AppFallbackScreen({
  title,
  message,
  primaryLabel = "Try again",
  onPrimary,
  secondaryLabel,
  onSecondary
}: Props) {
  return (
    <View style={styles.root}>
      {LOGO_IMAGE ? (
        <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.logoPlaceholder}>
          <Ionicons name="leaf" size={36} color={colors.primary} />
        </View>
      )}
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
  logo: {
    height: 72,
    width: 72
  },
  logoPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    height: 72,
    justifyContent: "center",
    width: 72
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
  }
});
