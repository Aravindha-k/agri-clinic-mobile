import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/** Soft radial glow behind the logo column. */
export function TodayHeroLogoGlow() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="logoHalo" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#F4E4B8" stopOpacity={0.55} />
            <Stop offset="45%" stopColor="#86EFAC" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={200} height={200} fill="url(#logoHalo)" opacity={0.72} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 200,
    left: 4,
    position: "absolute",
    top: 28,
    width: 200,
    zIndex: 0
  }
});
