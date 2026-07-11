import { hideNativeSplashSafe } from "../bootstrap/nativeSplash";

/**
 * @deprecated Native splash is hidden from KavyaCinematicSplash first layout only.
 * Kept for any legacy callers — no longer auto-hides on mount.
 */
export function useAppSplash(_hideWhenReady = false) {
  const hideNativeSplash = () => {
    void hideNativeSplashSafe("useAppSplash_manual");
  };

  return { hideNativeSplash };
}
