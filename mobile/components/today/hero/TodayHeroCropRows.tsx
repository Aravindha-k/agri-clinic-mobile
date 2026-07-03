import Svg, { Line, Path } from "react-native-svg";
import { StyleSheet, View } from "react-native";

/** Subtle crop-row perspective lines — enterprise field texture. */
export function TodayHeroCropRows() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 320 120" preserveAspectRatio="xMidYMax meet">
        {[0, 1, 2, 3, 4].map((i) => (
          <Path
            key={`row-${i}`}
            d={`M0 ${88 + i * 6} Q160 ${78 + i * 4} 320 ${86 + i * 5}`}
            stroke="#3D7A52"
            strokeOpacity={0.12 - i * 0.015}
            strokeWidth={0.8}
            fill="none"
          />
        ))}
        <Line x1={200} y1={70} x2={280} y2={98} stroke="#4A8B5E" strokeOpacity={0.1} strokeWidth={0.7} />
        <Line x1={220} y1={68} x2={300} y2={96} stroke="#4A8B5E" strokeOpacity={0.08} strokeWidth={0.7} />
        <Line x1={240} y1={66} x2={310} y2={94} stroke="#4A8B5E" strokeOpacity={0.06} strokeWidth={0.7} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    bottom: 0,
    height: "38%",
    opacity: 0.85,
    position: "absolute",
    right: 0,
    width: "62%"
  }
});
