import { StyleSheet, View, type ViewStyle } from "react-native";
import { KavyaLoader } from "../KavyaLoader";
import { Colors } from "../../lib/theme";

type Props = {
  style?: ViewStyle;
};

/** Full-screen branded seed loader for list/detail loading states. */
export function ScreenLoader({ style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <KavyaLoader fullScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bg,
    flex: 1,
    justifyContent: "center"
  }
});
