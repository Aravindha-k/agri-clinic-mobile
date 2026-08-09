import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { InteractionManager, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { Spacing } from "../../lib/theme";
import { ScreenCanvas } from "./ScreenCanvas";
import { BrandPageHeader } from "./BrandPageHeader";
import { ScreenEntranceBloom } from "../ui/ScreenEntranceBloom";

const EntranceTickContext = createContext(1);

export function useEntranceTick() {
  return useContext(EntranceTickContext);
}

type Props = {
  children: ReactNode | ((tick: number) => ReactNode);
  style?: StyleProp<ViewStyle>;
  withCanvas?: boolean;
  /** Defer SVG backdrop until after navigation transition (smoother push). */
  deferCanvas?: boolean;
  /** Animated brand row at top — on by default for stack/detail screens. */
  withBrandHeader?: boolean;
};

/** Home-style backdrop + bloom + entrance tick for child animations. */
export function ScreenEntranceShell({
  children,
  style,
  withCanvas = true,
  deferCanvas = false,
  withBrandHeader = false
}: Props) {
  const entranceTick = useScreenEntrance();
  const [canvasReady, setCanvasReady] = useState(!deferCanvas);

  useEffect(() => {
    if (!deferCanvas || !withCanvas) {
      setCanvasReady(!deferCanvas);
      return;
    }
    setCanvasReady(false);
    const task = InteractionManager.runAfterInteractions(() => {
      setCanvasReady(true);
    });
    return () => task.cancel();
  }, [deferCanvas, withCanvas]);

  return (
    <EntranceTickContext.Provider value={entranceTick}>
      <View style={[styles.root, style]}>
        {withCanvas && canvasReady ? <ScreenCanvas /> : null}
        <ScreenEntranceBloom replayKey={entranceTick} />
        {withBrandHeader ? <BrandPageHeader style={styles.brandHeader} /> : null}
        {typeof children === "function" ? children(entranceTick) : children}
      </View>
    </EntranceTickContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden"
  },
  brandHeader: {
    paddingTop: Spacing.sm,
    zIndex: 2
  }
});
