import type { RefObject } from "react";
import type { LayoutChangeEvent } from "react-native";
import type { ScrollView } from "react-native";

/** Track section Y inside ScrollView content via onLayout. */
export function sectionLayoutHandler(
  registry: RefObject<Record<string, number>>,
  key: string
) {
  return (event: LayoutChangeEvent) => {
    registry.current[key] = event.nativeEvent.layout.y;
  };
}

/** Scroll to a section registered with sectionLayoutHandler. */
export function scrollToRegisteredSection(
  scrollRef: RefObject<ScrollView | null>,
  registry: RefObject<Record<string, number>>,
  key: string,
  offset = 12,
  delayMs = 100
) {
  setTimeout(() => {
    const y = registry.current[key];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - offset), animated: true });
  }, delayMs);
}
