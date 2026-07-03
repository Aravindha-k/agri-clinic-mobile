import Svg, { Ellipse, Path } from "react-native-svg";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { DecorOpacity, Harvest } from "../../lib/designSystem";

const LEAF_SILHOUETTES = [
  { cx: 0.12, cy: 0.22, rx: 28, ry: 14, rot: -18 },
  { cx: 0.88, cy: 0.35, rx: 32, ry: 15, rot: 22 },
  { cx: 0.06, cy: 0.58, rx: 24, ry: 12, rot: -8 },
  { cx: 0.92, cy: 0.72, rx: 30, ry: 14, rot: 15 },
  { cx: 0.45, cy: 0.88, rx: 36, ry: 16, rot: -5 }
] as const;

/** Subtle crop contours + leaf silhouettes — opacity capped at 3%. */
export function PremiumFieldBackdrop() {
  const { width, height } = useWindowDimensions();
  const rows = 8;
  const paths = Array.from({ length: rows }, (_, i) => {
    const y = height * 0.08 + i * (height * 0.1);
    const amp = 10 + i * 1.5;
    return `M 0 ${y} Q ${width * 0.25} ${y - amp} ${width * 0.5} ${y} T ${width} ${y}`;
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {paths.map((d, i) => (
          <Path
            key={`row-${i}`}
            d={d}
            stroke={Harvest.forest}
            strokeOpacity={Math.min(DecorOpacity.contour + i * 0.0005, DecorOpacity.max)}
            strokeWidth={1}
            fill="none"
          />
        ))}
        {LEAF_SILHOUETTES.map((leaf, i) => (
          <Ellipse
            key={`leaf-${i}`}
            cx={width * leaf.cx}
            cy={height * leaf.cy}
            rx={leaf.rx}
            ry={leaf.ry}
            fill={Harvest.leaf}
            fillOpacity={DecorOpacity.leaf}
            rotation={leaf.rot}
            origin={`${width * leaf.cx}, ${height * leaf.cy}`}
          />
        ))}
      </Svg>
    </View>
  );
}
