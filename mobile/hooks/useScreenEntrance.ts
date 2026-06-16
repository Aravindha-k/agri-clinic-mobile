import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";

/** Increments on each tab revisit — first open plays once (no double-fire). */
export function useScreenEntrance() {
  const [tick, setTick] = useState(1);
  const skipFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      setTick((value) => value + 1);
    }, [])
  );

  return tick;
}
