import { radius } from "./radius";
import { spacing } from "./spacing";

export const lightTheme = {
  dark: false,
  colors: {
    background: "#F4FAF6",
    backgroundAlt: "#E8F2EC",
    card: "#FFFFFF",
    cardMuted: "#F6FAF7",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    primary: "#0F5132",
    primaryDark: "#0B5A38",
    primaryLight: "#0F5132",
    primarySoft: "#D4EDE0",
    primaryGradientStart: "#0F5132",
    primaryGradientEnd: "#0B5A38",
    teal: "#0F5132",
    tealSoft: "#D4EDE0",
    accent: "#FFFFFF",
    accentSoft: "#F0F6F3",
    text: "#122018",
    textSecondary: "#3D5247",
    muted: "#6B7F74",
    border: "#D0E2D8",
    borderSubtle: "#E2EDE6",
    danger: "#C62828",
    dangerSoft: "#FFEBEE",
    warning: "#E65100",
    warningSoft: "#FFF3E0",
    success: "#0F5132",
    successSoft: "#D8F0E3",
    overlay: "rgba(13, 74, 46, 0.45)",
    tabBar: "#FFFFFF",
    fab: "#0F5132",
    mapMarker: "#0B5A38",
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
