/** Premium brand header spacing — tight brand unit, generous content below. */
export const BrandHeaderSpacing = {
  logoToTitle: 12,
  titleToSubtitle: 6,
  subtitleToGreeting: 0,
  greetingToHero: 18,
  brandPanelBottom: 8,
  logoStageHorizontal: 14,
  logoStageVertical: 10,
  brandHeroRippleAnchorY: 88
} as const;

export const BRAND_HERO_RIPPLE_ANCHOR_Y_OFFSET = BrandHeaderSpacing.brandHeroRippleAnchorY;

/** Hero logo — prominent in glass header (reference mock). */
export const BRAND_LOGO_HERO = 92;
export const BRAND_LOGO_COMPACT = 40;
export const BRAND_LOGO_MINI = 36;
export const BRAND_LOGO_INLINE = 32;

/** Logo graphic fills this fraction of the badge diameter. */
export const BRAND_LOGO_FILL = 0.82;
