/** Shared splash background — must match native Android / Expo splash. */
export const CINEMATIC_SPLASH_BG = "#D8ECF8";

/** Crossfade target into login / app shell. */
export const SPLASH_EXIT_WASH = "#F8F7F2";

/** Full title/subtitle reveal completes ~1220 ms after first layout. */
export const SPLASH_ANIMATION_END_MS = 1220;

/** Readable hold after animations finish (ms). */
export const SPLASH_HOLD_AFTER_ANIM_MS = 2600;

/** Minimum cinematic visibility after first layout (ms). */
export const SPLASH_MIN_VISIBLE_MS = SPLASH_ANIMATION_END_MS + SPLASH_HOLD_AFTER_ANIM_MS;

/** Hard ceiling from first layout — never block forever (ms). */
export const SPLASH_MAX_VISIBLE_MS = 6500;

/** Exit fade duration (ms). */
export const SPLASH_EXIT_FADE_MS = 400;

/** Keep native splash until cinematic bg + logo at 75% have painted (ms). */
export const SPLASH_NATIVE_HANDOFF_MS = 520;
