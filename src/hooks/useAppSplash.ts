import { useEffect, useRef } from "react";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / web may not support native splash control */
});

/** Hide native splash once the custom animated splash is mounted. */
export function useAppSplash(hideWhenReady = false) {
  const hidden = useRef(false);

  useEffect(() => {
    if (hideWhenReady || hidden.current) return;
    hidden.current = true;
    void SplashScreen.hideAsync();
  }, [hideWhenReady]);

  const hideNativeSplash = () => {
    if (hidden.current) return;
    hidden.current = true;
    void SplashScreen.hideAsync();
  };

  return { hideNativeSplash };
}
