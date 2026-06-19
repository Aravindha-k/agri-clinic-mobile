import { StyleSheet, View } from "react-native";
import { ScreenLoader } from "../../mobile/components/layout/ScreenLoader";
import { colors } from "../theme/colors";

export function LoadingState({ message: _message = "Loading..." }: { message?: string }) {
  return (
    <View style={styles.state}>
      <ScreenLoader />
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 320,
    padding: 24
  }
});
