import { Platform, ViewStyle } from "react-native";
import type { AppTheme } from "./lightTheme";

function iosShadow(color: string, offsetY: number, opacity: number, radius: number): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius
  };
}

export function createShadows(colors: AppTheme["colors"]) {
  const tint = colors.primaryDark;
  return {
    card: Platform.select<ViewStyle>({
      ios: iosShadow(tint, 3, 0.05, 10),
      android: { elevation: 2 },
      default: {}
    }),
    elevated: Platform.select<ViewStyle>({
      ios: iosShadow(tint, 6, 0.08, 16),
      android: { elevation: 4 },
      default: {}
    }),
    fab: Platform.select<ViewStyle>({
      ios: iosShadow("#000000", 5, 0.16, 12),
      android: { elevation: 6 },
      default: {}
    }),
    pressed: Platform.select<ViewStyle>({
      ios: iosShadow(tint, 1, 0.04, 4),
      android: { elevation: 1 },
      default: {}
    })
  };
}

/** @deprecated Prefer createShadows(theme.colors) via useDesignSystem */
export const shadows = createShadows({
  primaryDark: "#0D4A2E"
} as AppTheme["colors"]);
