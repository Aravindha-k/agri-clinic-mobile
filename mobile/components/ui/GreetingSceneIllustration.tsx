import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

const FIELD = require("../../../assets/splash/rice-field.png");

/** Rice-field photo panel — right third of greeting card (reference mock). */
export function GreetingSceneIllustration() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Image source={FIELD} style={styles.field} resizeMode="cover" accessibilityIgnoresInvertColors />
      <Svg width="100%" height="100%" viewBox="0 0 160 200" style={styles.overlay} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgGradient id="sunGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FDE68A" stopOpacity={0.5} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Circle cx={108} cy={48} r={26} fill="url(#sunGlow)" />
        <Circle cx={108} cy={48} r={16} fill="#FBBF24" opacity={0.9} />
        <Path d="M20 78 Q34 70 48 76 T76 74" stroke="#FFFFFF" strokeWidth={1} fill="none" opacity={0.5} />
      </Svg>
      <View style={styles.orangeAccent} />
      <LinearGradient
        colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.4)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fadeLeft}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomRightRadius: 22,
    borderTopRightRadius: 22,
    bottom: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    width: "40%"
  },
  field: {
    height: "100%",
    width: "100%"
  },
  overlay: {
    ...StyleSheet.absoluteFillObject
  },
  orangeAccent: {
    backgroundColor: "rgba(251, 146, 60, 0.55)",
    borderRadius: 6,
    height: 28,
    position: "absolute",
    right: 18,
    top: "42%",
    transform: [{ rotate: "-8deg" }],
    width: 52
  },
  fadeLeft: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 32
  }
});
