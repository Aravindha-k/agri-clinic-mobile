import { Platform, StyleSheet, type ViewStyle } from "react-native";
import { FieldRadius } from "./fieldTheme";
import { Colors, Shadow } from "./theme";

const CARD_RADIUS = FieldRadius.card;
const LIST_RADIUS = FieldRadius.list;

/** Primary surface — premium white card with soft elevation. */
export const primaryCardStyle: ViewStyle = {
  backgroundColor: Colors.surface,
  borderRadius: CARD_RADIUS,
  borderColor: "rgba(15, 61, 40, 0.06)",
  borderWidth: StyleSheet.hairlineWidth,
  overflow: "hidden",
  ...Shadow.cardRaised
};

/** Secondary surface — off-white tint */
export const secondaryCardStyle: ViewStyle = {
  backgroundColor: Colors.surfaceMuted ?? "#F4F7F5",
  borderRadius: CARD_RADIUS,
  borderColor: "rgba(15, 81, 50, 0.07)",
  borderWidth: StyleSheet.hairlineWidth,
  overflow: "hidden"
};

/** Hero workday card shell — gradient applied in WorkdayHero. */
export const heroCardShellStyle: ViewStyle = {
  borderRadius: FieldRadius.hero,
  marginHorizontal: 16,
  overflow: "hidden",
  ...Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#052818",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.16,
      shadowRadius: 12
    },
    default: { elevation: 3 }
  })
};

export const fieldCardStyles = StyleSheet.create({
  primary: primaryCardStyle,
  secondary: secondaryCardStyle,
  hero: heroCardShellStyle,
  list: {
    ...primaryCardStyle,
    borderRadius: LIST_RADIUS
  }
});

export type FieldCardVariant = "primary" | "secondary" | "list";
