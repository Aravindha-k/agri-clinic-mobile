import { StyleSheet } from "react-native";
import { Colors, FontSize, FontWeight, Layout, Radius, Shadow, Spacing } from "./theme";

/** Shared UI primitives — use across screens for a consistent professional look. */
export const UI = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  screenPad: {
    paddingHorizontal: Spacing.screen
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: Layout.cardBorderWidth,
    ...Shadow.card
  },
  cardPad: {
    padding: Spacing.cardLg
  },
  pageTitle: {
    color: Colors.text1,
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3
  },
  pageSubtitle: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: 20
  },
  sectionLabel: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  iconBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.inner,
    borderWidth: Layout.cardBorderWidth,
    height: Layout.touchTargetMin - 8,
    justifyContent: "center",
    width: Layout.touchTargetMin - 8
  },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.button,
    borderWidth: Layout.cardBorderWidth,
    color: Colors.text1,
    fontSize: FontSize.md,
    height: 48,
    paddingHorizontal: Spacing.lg
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.sm
  }
});
