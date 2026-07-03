import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogoRippleBurst } from "../../../src/components/ui/LogoRippleBurst";
import { BRAND_HERO_RIPPLE_ANCHOR_Y_OFFSET } from "../brand/brandHeaderSpacing";

type Props = {
  replayKey: number | string;
  startDelay?: number;
};

/** Water-like ripple burst from the Today hero logo on first open / tab revisit. */
export function ScreenEntranceRipple({ replayKey, startDelay = 80 }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const anchorX = width / 2;
  const anchorY = insets.top + BRAND_HERO_RIPPLE_ANCHOR_Y_OFFSET;

  return (
    <LogoRippleBurst
      anchorX={anchorX}
      anchorY={anchorY}
      trigger={replayKey}
      startDelay={startDelay}
      baseSize={72}
      maxScale={5.4}
      color="rgba(15, 107, 67, 0.38)"
      borderWidth={1.5}
      ringCount={3}
    />
  );
}
