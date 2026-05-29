import { TextStyle } from "react-native";
import { colors } from "./colors";
import { fontWeights } from "./fontWeights";

export { fontWeights };

export const typography = {
  hero: {
    fontSize: 24,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.4,
    color: colors.text
  } as TextStyle,
  title: {
    fontSize: 20,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.2,
    color: colors.text
  } as TextStyle,
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: fontWeights.regular, color: colors.muted } as TextStyle,
  section: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.muted
  } as TextStyle,
  body: { fontSize: 15, lineHeight: 22, fontWeight: fontWeights.regular, color: colors.text } as TextStyle,
  caption: { fontSize: 12, fontWeight: fontWeights.medium, color: colors.muted } as TextStyle,
  metric: { fontSize: 28, fontWeight: fontWeights.heavy, color: colors.primaryDark } as TextStyle,
  button: { fontSize: 16, fontWeight: fontWeights.bold, letterSpacing: 0.2 } as TextStyle,
  label: { fontSize: 12, fontWeight: fontWeights.bold, letterSpacing: 0.4 } as TextStyle
} as const;
