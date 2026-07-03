import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, useWindowDimensions, type ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { DecorOpacity } from "../../lib/designSystem";
import { PremiumFieldBackdrop } from "./PremiumFieldBackdrop";

type Props = {
  style?: ViewStyle;
};

/** Warm premium backdrop — gradient, radial hero light, crop contours. */
export function ScreenCanvas({ style }: Props) {
  const { width, height } = useWindowDimensions();
  const heroLightY = height * 0.14;

  return (
    <>
      <LinearGradient
        colors={["#FBFAF7", "#F8F7F3", "#F2F5F0", "#EEF3EE"]}
        locations={[0, 0.35, 0.7, 1]}
        style={[StyleSheet.absoluteFill, style]}
        pointerEvents="none"
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="heroGlow" cx="50%" cy={`${(heroLightY / height) * 100}%`} rx="55%" ry="28%">
            <Stop offset="0%" stopColor="#F4E4B8" stopOpacity={DecorOpacity.max} />
            <Stop offset="45%" stopColor="#2E9B64" stopOpacity={DecorOpacity.max * 0.6} />
            <Stop offset="100%" stopColor="#FAF9F6" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#heroGlow)" />
      </Svg>
      <PremiumFieldBackdrop />
    </>
  );
}
