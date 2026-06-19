import { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
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
  /** Animated brand row at top — on by default for stack/detail screens. */
  withBrandHeader?: boolean;
};

/** Home-style backdrop + bloom + entrance tick for child animations. */
export function ScreenEntranceShell({
  children,
  style,
  withCanvas = true,
  withBrandHeader = true
}: Props) {
  const entranceTick = useScreenEntrance();

  return (
    <EntranceTickContext.Provider value={entranceTick}>
      <View style={[styles.root, style]}>
        {withCanvas ? <ScreenCanvas /> : null}
        <ScreenEntranceBloom replayKey={entranceTick} />
        {withBrandHeader ? <BrandPageHeader showWordmark style={styles.brandHeader} /> : null}
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
