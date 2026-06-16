import { StyleSheet, View } from "react-native";
import { Colors, Radius } from "../../lib/theme";

type Props = {
  progress: number;
  max?: number;
  color?: string;
  trackColor?: string;
  height?: number;
};

/** Simple flat progress bar — replaces cinematic NeonProgressBar. */
export function FlatProgressBar({
  progress,
  max = 1,
  color = Colors.amber,
  trackColor = Colors.border,
  height = 6
}: Props) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, progress / max)) : 0;

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: `${ratio * 100}%`,
            borderRadius: height / 2
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
    width: "100%"
  },
  fill: {
    height: "100%"
  }
});
