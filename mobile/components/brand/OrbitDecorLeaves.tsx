import { Image, StyleSheet, View } from "react-native";

const LEAF_A = require("../../../assets/splash/items/leaf.png");
const LEAF_B = require("../../../assets/splash/items/fall_leaf_a.png");

/** Static decorative leaves scattered around the logo orbit — matches reference mock. */
type LeafSpec = {
  source: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: string;
  opacity: number;
};

const LEAVES: LeafSpec[] = [
  { source: LEAF_A, x: -52, y: -38, w: 34, h: 40, rotate: "-32deg", opacity: 0.92 },
  { source: LEAF_B, x: 58, y: -44, w: 28, h: 34, rotate: "18deg", opacity: 0.85 },
  { source: LEAF_A, x: -46, y: 42, w: 30, h: 36, rotate: "42deg", opacity: 0.8 },
  { source: LEAF_B, x: 52, y: 36, w: 26, h: 32, rotate: "-12deg", opacity: 0.78 },
  { source: LEAF_A, x: -6, y: -58, w: 22, h: 28, rotate: "8deg", opacity: 0.7 }
];

export function OrbitDecorLeaves() {
  return (
    <View style={styles.stage} pointerEvents="none">
      {LEAVES.map((leaf, index) => (
        <Image
          key={index}
          source={leaf.source}
          style={[
            styles.leaf,
            {
              width: leaf.w,
              height: leaf.h,
              opacity: leaf.opacity,
              transform: [{ translateX: leaf.x }, { translateY: leaf.y }, { rotate: leaf.rotate }]
            }
          ]}
          resizeMode="contain"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0
  },
  leaf: {
    position: "absolute"
  }
});
