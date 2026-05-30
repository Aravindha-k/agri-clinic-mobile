import { StyleSheet, View } from "react-native";
import { AUTH_THEME } from "../../theme/authTheme";

type Props = {
  total: number;
  active: number;
};

export function StartupStepDots({ total, active }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i === active ? styles.dotActive : styles.dotIdle]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center"
  },
  dot: {
    borderRadius: 4,
    height: 8
  },
  dotActive: {
    backgroundColor: AUTH_THEME.neon,
    width: 22
  },
  dotIdle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 8
  }
});
