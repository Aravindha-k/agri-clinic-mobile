import Svg, { Path } from "react-native-svg";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { DecorOpacity, Harvest } from "../../../lib/designSystem";

const ROWS = 9;

/** Ultra-subtle crop contour lines — 2–3% opacity. */
export function TodayHeroContourPattern() {
  const { width } = useWindowDimensions();
  const w = width;
  const h = 320;
  const stroke = Harvest.forest;

  const paths = Array.from({ length: ROWS }, (_, i) => {
    const y = 18 + i * (h / ROWS);
    const amp = 6 + (i % 3) * 3;
    const phase = i * 0.15;
    return `M0 ${y} Q ${w * (0.22 + phase)} ${y - amp} ${w * 0.5} ${y} T ${w} ${y - amp * 0.35}`;
  });

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
        {paths.map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke={stroke}
            strokeOpacity={DecorOpacity.contour + (i % 2) * 0.004}
            strokeWidth={1}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject
  }
});
