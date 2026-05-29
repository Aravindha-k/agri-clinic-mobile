import { Text, TextProps, TextStyle } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme";

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
  color?: string;
};

/** Themed text with consistent weights from the design system. */
export function AppText({ variant = "body", muted, color, style, ...rest }: Props) {
  const { theme } = useTheme();
  const base = typography[variant];
  const textColor = color ?? (muted ? theme.colors.muted : (base.color as string) ?? theme.colors.text);

  return <Text {...rest} style={[base, { color: textColor }, style]} />;
}
