import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";

/**
 * Stable entrance key — animates once per screen mount only.
 * Refocus replay caused opacity flash ("phasing") on every tab return in release APKs.
 */
export function useScreenEntrance() {
  const [tick] = useState(1);
  const skipFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
      }
    }, [])
  );

  return tick;
}
