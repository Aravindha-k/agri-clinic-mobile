import Svg, { Path } from "react-native-svg";
import { StyleSheet, useWindowDimensions, View } from "react-native";

/** Subtle farm contour lines for workday hero control center. */
export function FarmContourPattern() {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 32, 400);
  const paths = [
    `M0 40 Q${w * 0.25} 28 ${w * 0.5} 38 T${w} 34`,
    `M0 52 Q${w * 0.3} 42 ${w * 0.55} 50 T${w} 46`,
    `M0 64 Q${w * 0.2} 56 ${w * 0.45} 62 T${w} 58`
  ];

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width={w} height={72} viewBox={`0 0 ${w} 72`}>
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke="#FFFFFF" strokeOpacity={0.08 + i * 0.02} strokeWidth={1} fill="none" />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    bottom: 0,
    left: 0,
    opacity: 0.9,
    position: "absolute",
    right: 0
  }
});
