import { StyleSheet, View, type ViewStyle } from "react-native";
import { Colors } from "../../lib/theme";

type Props = {
  style?: ViewStyle;
};

/** Flat full-screen background — replaces glass ScreenBackground. */
export function ScreenCanvas({ style }: Props) {
  return <View style={[StyleSheet.absoluteFill, styles.bg, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  bg: {
    backgroundColor: Colors.bg
  }
});
