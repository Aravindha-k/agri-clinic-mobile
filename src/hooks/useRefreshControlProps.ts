import { ColorValue } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export function useRefreshControlProps() {
  const { theme } = useTheme();
  return {
    tintColor: theme.colors.primary,
    colors: [theme.colors.primary] as ColorValue[]
  };
}
