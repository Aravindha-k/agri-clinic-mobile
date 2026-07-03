import { StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

const COLS = 9;
const ROWS = 5;
const STEP = 9;

/** Subtle dot grid — upper-right of Today brand header (reference mock). */
export function BrandHeaderDots() {
  const dots = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      dots.push(
        <Circle
          key={`${row}-${col}`}
          cx={col * STEP + 5}
          cy={row * STEP + 5}
          r={1.1}
          fill="rgba(15, 61, 40, 0.09)"
        />
      );
    }
  }

  return (
    <Svg width={COLS * STEP + 6} height={ROWS * STEP + 6} style={styles.dots} pointerEvents="none">
      {dots}
    </Svg>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: "absolute",
    right: 56,
    top: 14,
    zIndex: 2
  }
});
