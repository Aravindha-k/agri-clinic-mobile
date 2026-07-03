import { StyleSheet, type ViewStyle } from "react-native";
import { PremiumShadow } from "./designSystem";
import { TODAY_CARD_RADIUS } from "./todayLayout";
import { Colors } from "./theme";

/** Shared metric / content card shell for Today tab. */
export const todayMetricCardStyle: ViewStyle = {
  backgroundColor: Colors.surface,
  borderColor: "rgba(15, 61, 40, 0.07)",
  borderRadius: TODAY_CARD_RADIUS,
  borderWidth: StyleSheet.hairlineWidth,
  overflow: "hidden",
  ...PremiumShadow.card
};
