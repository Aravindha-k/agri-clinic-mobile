import { useEffect, useState } from "react";

/** Animate a number from 0 → target with easeOutCubic. */
export function useCountUp(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0;
    if (safeTarget <= 0) {
      setValue(0);
      return;
    }

    const timeout = setTimeout(() => {
      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.floor(eased * safeTarget));
        if (progress >= 1) {
          setValue(safeTarget);
          clearInterval(timer);
        }
      }, 16);
      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, duration, target]);

  return value;
}
