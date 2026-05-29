import { useMemo } from "react";
import { createDesignSystem } from "../theme/designSystem";
import { createShadows } from "../theme/shadows";
import { useTheme } from "../theme/ThemeContext";

export function useDesignSystem() {
  const { theme } = useTheme();
  return useMemo(
    () => ({
      ...createDesignSystem(theme),
      shadows: createShadows(theme.colors)
    }),
    [theme]
  );
}
