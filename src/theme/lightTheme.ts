import { radius } from "./radius";
import { spacing } from "./spacing";

export const lightTheme = {
  dark: false,
  colors: {
    background: "#F0F6F3",
    backgroundAlt: "#E4EFE8",
    card: "#FFFFFF",
    cardMuted: "#F6FAF7",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    primary: "#178F5C",
    primaryDark: "#0B5A38",
    primaryLight: "#2EAD72",
    primarySoft: "#D4EDE0",
    primaryGradientStart: "#0F5132",
    primaryGradientEnd: "#1E9B5E",
    teal: "#0D9488",
    tealSoft: "#CCFBF1",
    accent: "#C9920E",
    accentSoft: "#FFF4D6",
    text: "#122018",
    textSecondary: "#3D5247",
    muted: "#6B7F74",
    border: "#D0E2D8",
    borderSubtle: "#E2EDE6",
    danger: "#C62828",
    dangerSoft: "#FFEBEE",
    warning: "#E65100",
    warningSoft: "#FFF3E0",
    success: "#1B7A4A",
    successSoft: "#D8F0E3",
    overlay: "rgba(13, 74, 46, 0.45)",
    tabBar: "#FFFFFF",
    fab: "#1B7A4A",
    mapMarker: "#0D4A2E",
    timelineLine: "#C5DDD0",
    skeleton: "#E2EDE6",
    skeletonHighlight: "#F0F6F2",
    mapShell: "#0B1610",
    offlineBackground: "#0B1610",
    offlineCard: "#152419",
    offlineText: "#E8F2EC",
    offlineMuted: "#8FA899"
  },
  spacing,
  radius
};

export type AppTheme = {
  dark: boolean;
  colors: typeof lightTheme.colors;
  spacing: typeof spacing;
  radius: typeof radius;
};
