import { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle
} from "react-native-reanimated";
import { FadeInSection, entranceStagger } from "../ui/FadeInSection";
import { Grid } from "../../lib/designSystem";
import { TODAY_PAGE_PAD } from "../../lib/todayLayout";
import { BrandLogoBadge } from "./BrandLogoBadge";
import { BrandTagline } from "./BrandTagline";
import { BrandTitle } from "./BrandTitle";
import { computeOrbitStageSize } from "./AgriNatureMark";
import { homeLogoHeroColumnWidth, homeLogoHeroStageHeight } from "../today/HomeLogoHero";
import {
  BRAND_LOGO_COMPACT,
  BRAND_LOGO_FILL,
  BRAND_LOGO_HERO,
  BRAND_LOGO_MINI,
  BRAND_ORBIT_GAP_RATIO,
  BrandHeaderSpacing
} from "./brandHeaderSpacing";

function heroLogoColumnWidth() {
  const logoVisual = Math.round(BRAND_LOGO_HERO * BRAND_LOGO_FILL);
  const orbitStage = computeOrbitStageSize(logoVisual, { gapRatio: BRAND_ORBIT_GAP_RATIO, compact: true });
  return orbitStage + BrandHeaderSpacing.logoStageHorizontal;
}

export type BrandHeaderSize = "hero" | "compact" | "mini";
export type BrandHeaderVariant = "full" | "plain";
export type BrandHeaderLayout = "stacked" | "split";

type EntranceProps = {
  replayKey: number | string;
  step?: number;
};

type Props = {
  size?: BrandHeaderSize;
  variant?: BrandHeaderVariant;
  layout?: BrandHeaderLayout;
  align?: "center" | "left";
  right?: ReactNode;
  entrance?: EntranceProps;
  style?: StyleProp<ViewStyle>;
  scrollY?: SharedValue<number>;
  /** Replace default badge — used by Today HomeLogoHero. */
  logo?: ReactNode;
};

function logoSizeFor(size: BrandHeaderSize) {
  if (size === "mini") return BRAND_LOGO_MINI;
  if (size === "compact") return BRAND_LOGO_COMPACT;
  return BRAND_LOGO_HERO;
}

/** Brand hero — stacked (default) or split row (logo left, wordmark right). */
export function BrandHeader({
  size = "hero",
  variant = "plain",
  layout = "stacked",
  align = "center",
  right,
  entrance,
  style,
  scrollY,
  logo
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const compact = size !== "hero";
  const logoSize = logoSizeFor(size);
  const baseStep = entrance?.step ?? 0;
  const isFull = variant === "full" && size === "hero";
  const isSplit = layout === "split" && !compact;
  const homeLogoColumnW = homeLogoHeroColumnWidth(windowWidth);
  const homeLogoStageH = homeLogoHeroStageHeight(windowWidth);

  const logoScrollStyle = useAnimatedStyle(() => {
    if (!scrollY || size !== "hero") return {};
    return {
      transform: [
        {
          scale: interpolate(scrollY.value, [0, 140], [1, 0.9], Extrapolation.CLAMP)
        }
      ]
    };
  });

  const wordmarkScrollStyle = useAnimatedStyle(() => {
    if (!scrollY || size !== "hero") return {};
    return {
      opacity: interpolate(scrollY.value, [0, 100], [1, 0.75], Extrapolation.CLAMP)
    };
  });

  const logoBadge = logo ?? (
    <BrandLogoBadge
      size={logoSize}
      animated={size === "hero"}
      replayKey={entrance?.replayKey ?? 0}
      alignLeft={isSplit}
    />
  );
  const usesHomeLogo = Boolean(logo);

  const wordmark = (
    <View style={[styles.wordmark, !isSplit && { marginTop: BrandHeaderSpacing.logoToTitle }, align === "center" && !isSplit && styles.wordmarkCenter]}>
      <BrandTitle align={isSplit ? "left" : align} compact={compact} />
      {!compact ? <View style={{ height: BrandHeaderSpacing.titleToSubtitle }} /> : null}
      {!compact ? <BrandTagline align={isSplit ? "left" : align} /> : null}
    </View>
  );

  const brandCore = isSplit ? (
    <View style={styles.splitRow}>
      <Animated.View
        style={[
          usesHomeLogo
            ? [styles.logoColumnHome, { width: homeLogoColumnW, minHeight: homeLogoStageH }]
            : styles.logoColumn,
          logoScrollStyle
        ]}
      >
        {logoBadge}
      </Animated.View>
      <Animated.View style={[styles.splitCopy, wordmarkScrollStyle]}>
        {entrance ? (
          <FadeInSection replayKey={entrance.replayKey} delay={entranceStagger(baseStep + 1)} duration={280}>
            {wordmark}
          </FadeInSection>
        ) : (
          wordmark
        )}
      </Animated.View>
      {right ? <View style={styles.splitBell}>{right}</View> : null}
    </View>
  ) : (
    <View style={[styles.brandCore, align === "center" && styles.brandCoreCenter]}>
      <Animated.View style={[styles.logoRow, align === "center" && styles.logoRowCenter, logoScrollStyle]}>
        {logoBadge}
        {right && isFull ? <View style={styles.bellSlot}>{right}</View> : null}
      </Animated.View>
      {entrance ? (
        <FadeInSection replayKey={entrance.replayKey} delay={entranceStagger(baseStep + 1)} duration={280}>
          <Animated.View style={wordmarkScrollStyle}>{wordmark}</Animated.View>
        </FadeInSection>
      ) : (
        <Animated.View style={wordmarkScrollStyle}>{wordmark}</Animated.View>
      )}
    </View>
  );

  if (isSplit) {
    return (
      <View style={[styles.wrapSplit, style]}>
        <View style={styles.brandPanel}>{brandCore}</View>
      </View>
    );
  }

  const panel = isFull ? (
    <View style={styles.brandPanel}>{brandCore}</View>
  ) : (
    <>
      {right ? (
        <View style={styles.topRow}>
          <View style={styles.topSpacer} />
          <View style={styles.right}>{right}</View>
        </View>
      ) : null}
      {brandCore}
    </>
  );

  return (
    <View style={[styles.wrap, style]}>
      {panel}
      {isFull ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: TODAY_PAGE_PAD
  },
  wrapSplit: {
    paddingHorizontal: 0
  },
  brandPanel: {
    overflow: "visible",
    paddingBottom: 4
  },
  splitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    minHeight: 196,
    overflow: "visible",
    paddingTop: 6,
    position: "relative"
  },
  logoColumn: {
    alignItems: "flex-start",
    flexShrink: 0,
    justifyContent: "flex-start",
    marginLeft: -4,
    overflow: "visible",
    width: heroLogoColumnWidth(),
    zIndex: 2
  },
  logoColumnHome: {
    alignItems: "flex-start",
    flexShrink: 0,
    justifyContent: "center",
    overflow: "visible",
    zIndex: 2
  },
  splitCopy: {
    flex: 1,
    justifyContent: "center",
    minWidth: 96,
    paddingLeft: 4,
    paddingRight: 44
  },
  splitBell: {
    position: "absolute",
    right: 0,
    top: 0
  },
  logoRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
    width: "100%"
  },
  logoRowCenter: {
    alignItems: "center"
  },
  bellSlot: {
    position: "absolute",
    right: 0,
    top: 0
  },
  divider: {
    backgroundColor: "rgba(15, 81, 50, 0.08)",
    height: StyleSheet.hairlineWidth,
    marginTop: Grid.xs
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    minHeight: 36
  },
  topSpacer: {
    flex: 1
  },
  right: {
    flexShrink: 0
  },
  brandCore: {
    alignItems: "flex-start",
    overflow: "visible"
  },
  brandCoreCenter: {
    alignItems: "center"
  },
  wordmark: {
    width: "100%"
  },
  wordmarkCenter: {
    alignItems: "center"
  }
});
