import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AUTH_THEME } from "../theme/authTheme";

/** Minimal placeholder while auth restores session. */
export function BootstrapScreen() {
  return (
    <View style={[styles.screen, { backgroundColor: AUTH_THEME.bg }]}>
      <ActivityIndicator size="small" color={AUTH_THEME.neon} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  }
});
