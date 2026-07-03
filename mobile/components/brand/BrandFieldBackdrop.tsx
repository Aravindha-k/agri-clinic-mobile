import { StyleSheet, View } from "react-native";
import { Colors } from "../../lib/theme";

type Props = {
  diameter: number;
};

/** Faint crop-row pattern behind the logo — 3–5% opacity, non-interactive. */
export function BrandFieldBackdrop({ diameter }: Props) {
  const width = diameter * 1.75;
  const height = diameter * 1.35;

  return (
    <View pointerEvents="none" style={[styles.wrap, { width, height }]}>
      <View style={[styles.hill, { width: width * 0.92, height: height * 0.55 }]} />
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <View
          key={row}
          style={[
            styles.row,
            {
              top: height * (0.28 + row * 0.1),
              width: width * (0.55 + (row % 3) * 0.08),
              marginLeft: row % 2 === 0 ? width * 0.08 : width * 0.18
            }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute"
  },
  hill: {
    backgroundColor: Colors.brand700,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    bottom: "8%",
    opacity: 0.035,
    position: "absolute"
  },
  row: {
    backgroundColor: Colors.brand700,
    borderRadius: 1,
    height: 2,
    opacity: 0.04,
    position: "absolute"
  }
});
