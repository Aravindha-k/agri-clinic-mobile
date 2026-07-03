import { useEffect, useRef } from "react";
import { hideNativeSplashSafe } from "../bootstrap/nativeSplash";

/** Hide native Expo splash once the app shell is ready to paint. */
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
    void hideNativeSplashSafe("app_shell_ready");
  };

  return { hideNativeSplash };
};
