import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BrandLogo } from "../components/BrandLogo";
import { BRAND } from "../config/brand";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";
import { typography } from "../theme/typography";

export function Screen({
  children,
  scroll = true,
  style,
  keyboardAware = false
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  keyboardAware?: boolean;
}) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.screen, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screen, style]}>{children}</View>
  );

  if (!keyboardAware) {
    return body;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
      {body}
    </KeyboardAvoidingView>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function BrandHeader({
  title,
  subtitle,
  size = "md",
  showBrandName = true
}: {
  title: string;
  subtitle?: string;
  size?: "sm" | "md";
  showBrandName?: boolean;
}) {
  return (
    <View style={styles.brand}>
      <BrandLogo size={size === "sm" ? "sm" : "md"} />
      <View style={styles.brandText}>
        {showBrandName ? <Text style={styles.brandName}>{BRAND.appName}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  screen: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: space.lg,
    padding: space.lg,
    paddingBottom: space.xl + 8
  },
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  brandText: {
    flex: 1,
    minWidth: 0
  },
  brandName: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: "uppercase"
  },
  title: {
    ...typography.hero
  },
  subtitle: {
    ...typography.subtitle,
    marginTop: 4
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  label: {
    color: colors.muted,
    fontSize: 13
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2
  },
  sectionHeader: {
    marginBottom: space.sm + 2
  },
  sectionTitle: {
    ...typography.section
  },
  labelSpacer: {
    marginTop: space.md
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: space.md,
    justifyContent: "space-between"
  },
  flex1: {
    flex: 1
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  }
});
