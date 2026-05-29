import { useWindowDimensions } from "react-native";
import { useSafeAreaInsetsCompat } from "./useSafeAreaInsetsCompat";

/** Usable map height below AppHeader on full-screen map routes. */
export function useMapAreaHeight(headerBodyHeight = 118) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsetsCompat();
  const headerTotal = insets.top + headerBodyHeight;
  return Math.max(windowHeight - headerTotal, 220);
}
