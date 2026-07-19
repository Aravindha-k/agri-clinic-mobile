import { useSafeAreaInsetsCompat } from "./useSafeAreaInsetsCompat";
import { Layout } from "../../mobile/lib/theme";

/**
 * Bottom padding for stack (non-tab) screens so content clears gesture / 3-button nav.
 */
export function useStackBottomInset(extra: number = Layout.stackScrollBottom): number {
  const insets = useSafeAreaInsetsCompat();
  return Math.max(insets.bottom, 0) + extra;
}
