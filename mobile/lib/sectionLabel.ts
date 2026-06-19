import { Colors, FontSize, FontWeight } from "./theme";

/** Uppercase section header style (V2 design system). */
export const SECTION_LABEL = {
  color: Colors.text3,
  fontSize: FontSize.sm,
  fontWeight: FontWeight.semibold,
  letterSpacing: 0.7,
  textTransform: "uppercase" as const,
  marginBottom: 10
};
