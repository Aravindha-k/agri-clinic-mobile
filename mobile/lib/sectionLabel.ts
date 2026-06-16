import { Colors, FontSize, FontWeight } from "./theme";

/** Uppercase section header style (V2 design system). */
export const SECTION_LABEL = {
  color: Colors.text4,
  fontSize: FontSize.sm,
  fontWeight: FontWeight.semibold,
  letterSpacing: 0.8,
  textTransform: "uppercase" as const,
  marginBottom: 8
};
