import type { AppTheme } from "./lightTheme";

/** App-wide layout rhythm — compact premium mobile density. */
export const layout = {
  screenPaddingH: 16,
  screenPaddingBottom: 24,
  screenGap: 12,
  sectionGap: 16,
  cardPadding: 14,
  cardPaddingCompact: 12,
  inputMinHeight: 46,
  buttonMinHeight: 46,
  buttonMinHeightSm: 40,
  headerPaddingBottom: 16,
  listGap: 10,
  iconSizeSm: 16,
  iconSizeMd: 20,
  iconSizeLg: 24
} as const;

export type TypographyScale = ReturnType<typeof createTypography>;

export function createTypography(colors: AppTheme["colors"]) {
  return {
    pageTitle: {
      fontSize: 22,
      fontWeight: "900" as const,
      letterSpacing: -0.35,
      lineHeight: 28,
      color: colors.text
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800" as const,
      letterSpacing: -0.15,
      lineHeight: 22,
      color: colors.text
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "800" as const,
      lineHeight: 20,
      color: colors.text
    },
    body: {
      fontSize: 14,
      fontWeight: "500" as const,
      lineHeight: 20,
      color: colors.text
    },
    bodyStrong: {
      fontSize: 14,
      fontWeight: "700" as const,
      lineHeight: 20,
      color: colors.text
    },
    meta: {
      fontSize: 13,
      fontWeight: "600" as const,
      lineHeight: 18,
      color: colors.textSecondary
    },
    caption: {
      fontSize: 12,
      fontWeight: "600" as const,
      lineHeight: 16,
      color: colors.muted
    },
    label: {
      fontSize: 11,
      fontWeight: "800" as const,
      letterSpacing: 0.45,
      textTransform: "uppercase" as const,
      color: colors.muted
    },
    metric: {
      fontSize: 26,
      fontWeight: "900" as const,
      letterSpacing: -0.4,
      lineHeight: 30,
      color: colors.primaryDark
    }
  };
}

export function createDesignSystem(theme: AppTheme) {
  return {
    theme,
    colors: theme.colors,
    spacing: theme.spacing,
    radius: theme.radius,
    layout,
    type: createTypography(theme.colors)
  };
}

export type DesignSystem = ReturnType<typeof createDesignSystem>;
