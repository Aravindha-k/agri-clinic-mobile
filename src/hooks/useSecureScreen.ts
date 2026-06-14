import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { Platform } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { isExpoGo } from "../utils/expoRuntime";

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

/** Blocks Android screenshots/recording (FLAG_SECURE) while the screen is focused. */
export function useSecureScreen() {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android" || isExpoGo()) {
        return undefined;
      }

      let active = true;
      void enableSecureFlag().catch(() => undefined);

      return () => {
        if (!active) return;
        active = false;
        void disableSecureFlag().catch(() => undefined);
      };
    }, [])
  );
}
