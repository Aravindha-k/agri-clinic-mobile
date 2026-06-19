import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { ForestGradient } from "../../lib/forestDarkTheme";

const LOGIN_FOREST = require("../../../assets/backgrounds/login-forest.webp");

type Props = {
  style?: StyleProp<ViewStyle>;
};

/** Forest-dark gradient backdrop for login. */
export function NatureForestBackdrop({ style }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <LinearGradient
        colors={[...ForestGradient.loginBackdrop]}
        locations={[...ForestGradient.loginBackdropLocations]}
        style={StyleSheet.absoluteFill}
      />
      <Image source={LOGIN_FOREST} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      <LinearGradient
        colors={["rgba(10,15,11,0.62)", "rgba(10,15,11,0.68)"]}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.04)", "transparent"]}
        locations={[0, 0.48]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
