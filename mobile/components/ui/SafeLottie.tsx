import LottieView, { type LottieViewProps } from "lottie-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { usePremiumMotion } from "../../../src/hooks/usePremiumMotion";
import { qaLogAnimationFallback } from "../../../src/utils/qaLog";

type Props = Omit<LottieViewProps, "source"> & {
  source: LottieViewProps["source"];
  style?: StyleProp<ViewStyle>;
  fallback?: ReactNode;
  componentName?: string;
};

/** Lottie with static fallback — never crashes the parent screen. */
export function SafeLottie({
  source,
  style,
  fallback = null,
  componentName = "SafeLottie",
  autoPlay = true,
  loop = true,
  ...rest
}: Props) {
  const { reduced, enabled } = usePremiumMotion();
  const [failed, setFailed] = useState(false);

  if (reduced || !enabled || failed) {
    return fallback ? <View style={style}>{fallback}</View> : null;
  }

  return (
    <View style={style}>
      <LottieView
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        style={StyleSheet.absoluteFill}
        onAnimationFailure={() => {
          qaLogAnimationFallback(componentName, "lottie_animation_failure");
          setFailed(true);
        }}
        {...rest}
      />
    </View>
  );
}
