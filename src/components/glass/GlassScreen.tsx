import { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { ENT } from "../../theme/enterprise";
import ScreenBackground from "./ScreenBackground";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/** Standard app screen shell — light background, content on top. */
export function GlassScreen({ children, style, contentStyle }: Props) {
  return (
    <View style={[styles.root, style]}>
      <ScreenBackground />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: ENT.bg,
    flex: 1
  },
  content: {
    flex: 1,
    zIndex: 2
  }
});
