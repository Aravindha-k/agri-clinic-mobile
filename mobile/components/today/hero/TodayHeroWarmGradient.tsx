import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

/** 4-stop warm field gradient — base layer of Today hero. */
export function TodayHeroWarmGradient() {
  return (
    <LinearGradient
      colors={["#FDFBF6", "#F7F0E4", "#E9F4EC", "#E2EEE6"]}
      locations={[0, 0.32, 0.68, 1]}
      style={StyleSheet.absoluteFill}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      pointerEvents="none"
    />
  );
}
