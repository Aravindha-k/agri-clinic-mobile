import { AccessibilityInfo } from "react-native";

/**
 * Polite screen-reader announcement for important async state changes.
 * Never announce timer ticks. Swallow failures so a11y never blocks UX.
 */
export function announceA11y(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return;
  try {
    AccessibilityInfo.announceForAccessibility(trimmed);
  } catch {
    // ignore
  }
}
