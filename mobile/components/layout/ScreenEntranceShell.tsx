import { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { ScreenCanvas } from "./ScreenCanvas";
import { ScreenEntranceWash } from "./ScreenEntranceWash";

const EntranceTickContext = createContext(1);

export function useEntranceTick() {
  return useContext(EntranceTickContext);
}

type Props = {
  children: ReactNode | ((tick: number) => ReactNode);
  style?: StyleProp<ViewStyle>;
  withCanvas?: boolean;
};

/** Home-style backdrop + top wash + entrance tick for child animations. */
export function ScreenEntranceShell({ children, style, withCanvas = true }: Props) {
  const entranceTick = useScreenEntrance();

  return (
    <EntranceTickContext.Provider value={entranceTick}>
      <View style={[styles.root, style]}>
        {withCanvas ? <ScreenCanvas /> : null}
        <ScreenEntranceWash replayKey={entranceTick} />
        {typeof children === "function" ? children(entranceTick) : children}
      </View>
    </EntranceTickContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
