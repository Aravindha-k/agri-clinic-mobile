import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const LOGIN_BACKDROP = require("../../assets/backgrounds/login-backdrop.webp");

type Props = {
  style?: StyleProp<ViewStyle>;
};

/** Full-bleed hero image — cover, plant-forward framing. */
export function LoginImagePanel({ style }: Props) {
  return (
    <View style={[styles.frame, style]} pointerEvents="none">
      <Image
        source={LOGIN_BACKDROP}
        style={styles.image}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "#F8F7F2",
    overflow: "hidden"
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    left: "-5%",
    width: "110%"
  }
});

/** @deprecated */
export function LoginScreenBackdrop() {
  return <LoginImagePanel style={StyleSheet.absoluteFill} />;
}

/** @deprecated */
export function LoginHeroBackdrop() {
  return <LoginImagePanel style={StyleSheet.absoluteFill} />;
}

/** @deprecated */
export function SeedlingSunriseBackdrop() {
  return <LoginImagePanel style={StyleSheet.absoluteFill} />;
}
