import { Image, StyleSheet, View } from "react-native";

const LEAF = require("../../../assets/splash/items/leaf.png");

/** Large leaf branch — bottom-right of welcome glass (reference mock). */
export function GreetingLeafAccent() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Image source={LEAF} style={styles.leaf} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    bottom: -6,
    position: "absolute",
    right: -4,
    zIndex: 2
  },
  leaf: {
    height: 132,
    transform: [{ rotate: "-14deg" }],
    width: 108
  }
});
