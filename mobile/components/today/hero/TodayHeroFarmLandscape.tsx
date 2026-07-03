import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop
} from "react-native-svg";
import { StyleSheet, View } from "react-native";

/** Soft enterprise farm vista — low-contrast hills, sunrise, small farmhouse. */
export function TodayHeroFarmLandscape() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 300 180" preserveAspectRatio="xMaxYMax meet">
        <Defs>
          <SvgGradient id="skyWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FEF3C7" stopOpacity={0.35} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgGradient>
          <SvgGradient id="hillA" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#A8D5B5" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#6FAF82" stopOpacity={0.38} />
          </SvgGradient>
          <SvgGradient id="hillB" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#8FC9A0" stopOpacity={0.32} />
            <Stop offset="100%" stopColor="#4F9468" stopOpacity={0.42} />
          </SvgGradient>
          <SvgGradient id="hillC" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#7BB892" stopOpacity={0.36} />
            <Stop offset="100%" stopColor="#3D8B58" stopOpacity={0.48} />
          </SvgGradient>
        </Defs>

        <Path d="M120 0 L300 0 L300 90 L120 90 Z" fill="url(#skyWash)" />
        <Circle cx={232} cy={38} r={28} fill="#FDE68A" opacity={0.22} />
        <Circle cx={232} cy={38} r={14} fill="#FCD34D" opacity={0.32} />

        <Path d="M60 132 C110 108 170 118 300 104 L300 180 L60 180 Z" fill="url(#hillA)" />
        <Path d="M0 148 C80 128 160 138 300 126 L300 180 L0 180 Z" fill="url(#hillB)" />
        <Path d="M80 162 C140 148 210 158 300 150 L300 180 L80 180 Z" fill="url(#hillC)" />

        <Path d="M208 142 L218 126 L228 142 Z" fill="#9A7B4F" opacity={0.45} />
        <Path d="M204 142 L232 142 L232 154 L204 154 Z" fill="#F3EBD8" opacity={0.5} />
        <Path d="M214 146 L214 154 M222 146 L222 154" stroke="#C9B08A" strokeWidth={0.8} opacity={0.5} />

        <Path d="M176 72 Q180 68 184 72" stroke="#FFFFFF" strokeWidth={0.8} fill="none" opacity={0.35} />
        <Path d="M192 66 Q196 62 200 66" stroke="#FFFFFF" strokeWidth={0.7} fill="none" opacity={0.28} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    bottom: 0,
    height: "46%",
    opacity: 0.92,
    position: "absolute",
    right: 0,
    width: "54%"
  }
});
