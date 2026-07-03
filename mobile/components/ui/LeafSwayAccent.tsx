import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { AppIcon } from "./AppIcon";

const LEAF_SWAY = require("../../../assets/lottie/leaf_sway.json");

type Props = {
  size?: number;
};

/** Subtle animated leaf — greeting accent. */
export function LeafSwayAccent({ size = 26 }: Props) {
  const { reduced } = usePremiumMotion();
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (reduced) return;
    lottieRef.current?.play();
  }, [reduced]);

  if (reduced) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <AppIcon name="leaf" size={size * 0.55} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <LottieView ref={lottieRef} source={LEAF_SWAY} autoPlay loop style={{ width: size, height: size }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
