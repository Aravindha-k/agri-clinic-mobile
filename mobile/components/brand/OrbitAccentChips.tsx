import { StyleSheet, View } from "react-native";

/** Small accent chips around the logo orbit — reference mock peach + mint squares. */
const CHIPS = [
  { x: -38, y: -8, size: 10, color: "#F4C4A8", rotate: "-12deg" },
  { x: 44, y: -22, size: 8, color: "#C8E6C9", rotate: "8deg" },
  { x: -28, y: 34, size: 9, color: "#C8E6C9", rotate: "15deg" },
  { x: 50, y: 28, size: 10, color: "#F4C4A8", rotate: "-6deg" }
] as const;

export function OrbitAccentChips() {
  return (
    <View style={styles.stage} pointerEvents="none">
      {CHIPS.map((chip, index) => (
        <View
          key={index}
          style={[
            styles.chip,
            {
              width: chip.size,
              height: chip.size,
              borderRadius: chip.size * 0.35,
              backgroundColor: chip.color,
              transform: [{ translateX: chip.x }, { translateY: chip.y }, { rotate: chip.rotate }]
            }
          ]}
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
  chip: {
    opacity: 0.9,
    position: "absolute"
  }
});
