import { useContext } from "react";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import type { EdgeInsets } from "react-native-safe-area-context";

const ZERO: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Same as useSafeAreaInsets when inside SafeAreaProvider; otherwise zero (no throw). */
export function useSafeAreaInsetsCompat(): EdgeInsets {
  const insets = useContext(SafeAreaInsetsContext);
  return insets ?? ZERO;
}
