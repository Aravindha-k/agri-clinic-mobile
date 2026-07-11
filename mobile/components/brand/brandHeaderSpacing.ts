/** Premium brand header spacing — tight brand unit, generous content below. */
export const BrandHeaderSpacing = {
  logoToTitle: 12,
  titleToSubtitle: 6,
  subtitleToGreeting: 0,
  greetingToHero: 18,
  brandPanelBottom: 8,
  logoStageHorizontal: 6,
  logoStageVertical: 6,
  brandHeroRippleAnchorY: 88
} as const;

export const BRAND_HERO_RIPPLE_ANCHOR_Y_OFFSET = BrandHeaderSpacing.brandHeroRippleAnchorY;

/** Hero logo — full mark; orbit runs in the band outside the badge. */
export const BRAND_LOGO_HERO = 104;
/** Compact header chip — Work, Day, Tracking tabs. */
export const BRAND_LOGO_INLINE = 46;
/** Page headers using BrandLogoBadge (non-Today). */
export const BRAND_LOGO_COMPACT = 50;
export const BRAND_LOGO_MINI = 44;
export const BRAND_LOGO_INLINE_COVER = 1.12;

/** Gap between logo edge and orbit band — 20% of logo diameter. */
export const BRAND_ORBIT_GAP_RATIO = 0.2;

/** Logo nearly fills the inner orbit circle. */
export const BRAND_LOGO_FILL = 0.98;
export const BRAND_LOGO_COVER_SCALE = 1.12;

/** Gentle zoom in / out on the hero logo mark. */
export const BRAND_LOGO_ZOOM_MIN = 0.94;
export const BRAND_LOGO_ZOOM_MAX = 1.06;
export const BRAND_LOGO_ZOOM_MS = 2600;
