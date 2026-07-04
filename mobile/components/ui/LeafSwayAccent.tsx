import { StyleSheet, View } from "react-native";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { AppIcon } from "./AppIcon";
import { SafeLottie } from "./SafeLottie";

const LEAF_SWAY = require("../../../assets/lottie/leaf_sway.json");

type Props = {
  size?: number;
};

/** Subtle animated leaf — greeting accent. */
const leafFallback = (size: number) => <AppIcon name="leaf" size={size * 0.55} />;

export function LeafSwayAccent({ size = 26 }: Props) {
  const { reduced, enabled } = usePremiumMotion();

  if (reduced || !enabled) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        {leafFallback(size)}
      </View>
    );
  }

  return (
    <SafeLottie
      source={LEAF_SWAY}
      autoPlay
      loop
      componentName="LeafSwayAccent"
      style={[styles.wrap, { width: size, height: size }]}
      fallback={leafFallback(size)}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
