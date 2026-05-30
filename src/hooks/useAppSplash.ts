import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / web may not support native splash control */
});

/** Hide native splash immediately so custom intro matches green background (no white flash). */
export function useAppSplash() {
  const hidden = useRef(false);

  useEffect(() => {
    if (hidden.current) return;
    hidden.current = true;
    void SplashScreen.hideAsync();
  }, []);
}
