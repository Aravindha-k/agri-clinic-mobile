import { StyleSheet, View, type ViewStyle } from "react-native";
import { ENT } from "../../theme/enterprise";

type Props = {
  style?: ViewStyle;
};

/** Flat app background — no aurora or gradient. Used on all main tab screens. */
export default function ScreenBackground({ style }: Props) {
  return <View style={[StyleSheet.absoluteFill, styles.bg, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  bg: {
    backgroundColor: ENT.bg
  }
});
