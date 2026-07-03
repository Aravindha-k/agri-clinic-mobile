import Svg, { Path } from "react-native-svg";
import { StyleSheet, View } from "react-native";
import { DecorOpacity, Harvest } from "../../lib/designSystem";

/** Soft field contour illustration for greeting hero. */
export function GreetingFieldIllustration() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 360 80" preserveAspectRatio="xMidYMax slice">
        <Path
          d="M0 52 Q90 38 180 50 T360 44 L360 80 L0 80 Z"
          fill={Harvest.leaf}
          fillOpacity={DecorOpacity.max}
        />
        <Path
          d="M0 62 Q120 48 240 58 T360 54 L360 80 L0 80 Z"
          fill={Harvest.forest}
          fillOpacity={DecorOpacity.max * 0.7}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    bottom: 0,
    height: 72,
    left: 0,
    position: "absolute",
    right: 0
  }
});
