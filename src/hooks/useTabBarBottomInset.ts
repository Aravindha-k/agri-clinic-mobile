import { useSafeAreaInsetsCompat } from "./useSafeAreaInsetsCompat";
import { FAB_RISE_ABOVE_BAR, TAB_BAR_CONTENT_HEIGHT } from "../theme/tabBar";

export function useTabBarBottomInset() {
  const insets = useSafeAreaInsetsCompat();
  const safeBottom = Math.max(insets.bottom, 0);
  return safeBottom + TAB_BAR_CONTENT_HEIGHT + FAB_RISE_ABOVE_BAR + 12;
}

export function useMapTabBarBottomPadding() {
  const insets = useSafeAreaInsetsCompat();
  return Math.max(insets.bottom, 0) + TAB_BAR_CONTENT_HEIGHT + FAB_RISE_ABOVE_BAR + 24;
}
