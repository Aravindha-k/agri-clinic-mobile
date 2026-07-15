import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, FontSize, Spacing } from "../../lib/theme";

export const VISIT_FOOTER_SCROLL_SPACE = 148;

export function VisitBottomFooter({
  hint,
  children
}: {
  hint?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    bottom: 0,
    gap: 6,
    left: 0,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    position: "absolute",
    right: 0
  },
  hint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    textAlign: "center"
  }
});
