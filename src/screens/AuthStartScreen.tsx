import { useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { CinematicIntroView } from "../components/auth/CinematicIntroView";
import { AUTH_THEME } from "../theme/authTheme";
import { LoginScreen } from "./LoginScreen";

/** Intro animation → premium login (auth API unchanged). */
export function AuthStartScreen() {
  const [introDone, setIntroDone] = useState(false);
  const loginOpacity = useRef(new Animated.Value(0)).current;

  function onIntroComplete() {
    setIntroDone(true);
    Animated.timing(loginOpacity, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true
    }).start();
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.login, { opacity: loginOpacity }]}
        pointerEvents={introDone ? "auto" : "none"}
      >
        <LoginScreen />
      </Animated.View>
      {!introDone ? <CinematicIntroView onComplete={onIntroComplete} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: AUTH_THEME.bg,
    flex: 1
  },
  login: {
    flex: 1
  }
});
