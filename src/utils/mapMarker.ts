import { Platform } from "react-native";

const ANDROID_PIN_COLORS = new Set(["red", "green", "purple", "blue"]);

/** Android MapView Marker pinColor only accepts named colors — custom hex can crash native layer. */
export function safeMarkerPinColor(color?: string): string | undefined {
  if (!color) return undefined;
  if (Platform.OS === "android") {
    const key = color.trim().toLowerCase();
    return ANDROID_PIN_COLORS.has(key) ? key : undefined;
  }
  return color;
}
