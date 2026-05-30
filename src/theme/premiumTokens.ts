/**
 * Unified premium design tokens — use via useTheme() + these layout helpers.
 */
import { space } from "./spacing";
import { radius } from "./radius";
import { fontWeights } from "./fontWeights";

export const premium = {
  space,
  radius,
  fontWeights,
  screenPadding: space.lg,
  cardGap: space.md,
  sectionGap: space.lg,
  minTouch: 48,
  heroTitle: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.6 },
  sectionTitle: { fontSize: 17, fontWeight: "800" as const },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: "600" as const },
  chip: { fontSize: 11, fontWeight: "800" as const, letterSpacing: 0.3 }
} as const;
