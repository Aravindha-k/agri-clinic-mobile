/** Shared splash background — must match native Android / Expo splash. */
export const CINEMATIC_SPLASH_BG = "#D8ECF8";

/** Native Android / Expo launch screen — solid emerald handoff. */
export const NATIVE_LAUNCH_BG = "#0B3D2E";

/** Crossfade target into login / app shell. */
export const SPLASH_EXIT_WASH = "#F8F7F2";

/** Logo + title reveal completes (~1000 ms after first layout). */
export const SPLASH_ANIMATION_END_MS = 1000;

/** Premium hold with slow background Ken Burns (ms). */
export const SPLASH_HOLD_AFTER_ANIM_MS = 900;

/** Minimum cinematic visibility after first layout (ms). */
export const SPLASH_MIN_VISIBLE_MS = SPLASH_ANIMATION_END_MS + SPLASH_HOLD_AFTER_ANIM_MS;

/** Hard ceiling from first layout — never block forever (ms). */
export const SPLASH_MAX_VISIBLE_MS = 6500;

/** Exit fade duration (ms). */
export const SPLASH_EXIT_FADE_MS = 450;

/** Keep native splash until cinematic bg has painted (ms). */
export const SPLASH_NATIVE_HANDOFF_MS = 320;

/** Background Ken Burns zoom cycle (ms). */
export const SPLASH_KEN_BURNS_MS = 6200;

/** Background scale range for Ken Burns. */
export const SPLASH_KEN_BURNS_SCALE_MIN = 1;
export const SPLASH_KEN_BURNS_SCALE_MAX = 1.045;

/** Subtle logo breathe after entry (ms per half-cycle). */
export const SPLASH_LOGO_BREATHE_MS = 2000;
