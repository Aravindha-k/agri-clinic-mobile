import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { useAuth } from "../storage/AuthContext";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / web may not support native splash control */
});

/** Hides the native splash once auth bootstrap finishes. */
export function useAppSplash() {
  const { isReady } = useAuth();
  const hidden = useRef(false);

  useEffect(() => {
    if (!isReady || hidden.current) return;
    hidden.current = true;
    void SplashScreen.hideAsync();
  }, [isReady]);
}
