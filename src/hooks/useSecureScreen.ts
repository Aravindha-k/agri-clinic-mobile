import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { InteractionManager, Platform } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { isExpoGo } from "../utils/expoRuntime";
import { shouldPreventScreenCapture } from "../utils/screenCapturePolicy";

let secureDepth = 0;

async function enableSecureFlag() {
  if (secureDepth === 0) {
    await ScreenCapture.preventScreenCaptureAsync();
  }
  secureDepth += 1;
}

async function disableSecureFlag() {
  secureDepth = Math.max(0, secureDepth - 1);
  if (secureDepth === 0) {
    await ScreenCapture.allowScreenCaptureAsync();
  }
}

function isProtectionActive(): boolean {
  return shouldPreventScreenCapture({
    platform: Platform.OS,
    isExpoGo: isExpoGo(),
    isDev: typeof __DEV__ !== "undefined" ? __DEV__ : false,
    allowScreenCaptureEnv: process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE
  });
}

/** Blocks Android screenshots/recording (FLAG_SECURE) while the screen is focused. */
export function useSecureScreen() {
  useFocusEffect(
    useCallback(() => {
      if (!isProtectionActive()) {
        return undefined;
      }

      let active = true;
      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (cancelled || !active) return;
        void enableSecureFlag().catch(() => undefined);
      });

      return () => {
        cancelled = true;
        active = false;
        task.cancel?.();
        void disableSecureFlag().catch(() => undefined);
      };
    }, [])
  );
}
