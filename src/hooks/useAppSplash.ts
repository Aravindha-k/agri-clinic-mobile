import { useEffect, useRef } from "react";
import { hideNativeSplashSafe } from "../bootstrap/nativeSplash";

/** Hide native splash once the custom animated splash is mounted. */
export function useAppSplash(hideWhenReady = false) {
  const hidden = useRef(false);

  useEffect(() => {
    if (hideWhenReady || hidden.current) return;
    hidden.current = true;
    void hideNativeSplashSafe("useAppSplash_effect");
  }, [hideWhenReady]);

  const hideNativeSplash = () => {
    if (hidden.current) return;
    hidden.current = true;
    void hideNativeSplashSafe("kavya_splash_ready");
  };

  return { hideNativeSplash };
}
