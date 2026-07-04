import { useEffect, type ComponentType } from "react";
import { ScreenErrorBoundary } from "./ScreenErrorBoundary";
import { qaLogScreenOpen } from "../utils/qaLog";

/** Wraps a screen with crash recovery — keeps app open on render errors. */
export function withScreenErrorBoundary<P extends object>(
  Wrapped: ComponentType<P>,
  screenName: string
): ComponentType<P> {
  function ScreenWithBoundary(props: P) {
    useEffect(() => {
      qaLogScreenOpen(screenName);
    }, []);

    return (
      <ScreenErrorBoundary screenName={screenName}>
        <Wrapped {...props} />
      </ScreenErrorBoundary>
    );
  }

  ScreenWithBoundary.displayName = `ScreenBoundary(${screenName})`;
  return ScreenWithBoundary;
}
