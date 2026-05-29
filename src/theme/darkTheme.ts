import { radius } from "./radius";
import { spacing } from "./spacing";

import type { AppTheme } from "./lightTheme";

export const darkTheme: AppTheme = {
  dark: true,
  colors: {
    background: "#0E1612",
    backgroundAlt: "#152019",
    card: "#1A2820",
    cardMuted: "#1F3026",
    surface: "#1E2C24",
    surfaceElevated: "#243329",
    teal: "#2DD4BF",
    tealSoft: "#134E4A",
    borderSubtle: "#243329",
    primary: "#3CB371",
    primaryDark: "#2A9D5C",
    primaryLight: "#5FD68E",
    primarySoft: "#1A3D2A",
    primaryGradientStart: "#0A3020",
    primaryGradientEnd: "#1B7A4A",
    accent: "#E8B84A",
    accentSoft: "#3D3520",
    text: "#E8F2EC",
    textSecondary: "#B8C9BE",
    muted: "#8A9E92",
    border: "#2A3D32",
    danger: "#EF5350",
    dangerSoft: "#3D2020",
    warning: "#FFB74D",
    warningSoft: "#3D3020",
    success: "#4CAF50",
    successSoft: "#1A3D24",
    overlay: "rgba(0, 0, 0, 0.6)",
    tabBar: "#1A2820",
    fab: "#3CB371",
    mapMarker: "#5FD68E",
    timelineLine: "#2A4034",
    skeleton: "#243028",
    skeletonHighlight: "#2E3C34",
    mapShell: "#0B1610",
    offlineBackground: "#0B1610",
    offlineCard: "#152419",
    offlineText: "#E8F2EC",
    offlineMuted: "#8FA899"
  },
  spacing,
  radius
} as const;
