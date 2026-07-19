import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import {
  contentMaxWidthStyle,
  dayMapMinHeight,
  fontScaleBucket,
  isCompactHeight,
  isNarrowWidth,
  pageHorizontalPad,
  pixelDensityLabel,
  responsiveBucket
} from "../utils/responsiveLayout";

/** Live window metrics for layout decisions — never cache Dimensions once at module load. */
export function useResponsiveLayout() {
  const { width, height, fontScale, scale } = useWindowDimensions();

  return useMemo(() => {
    const compactHeight = isCompactHeight(height);
    const narrow = isNarrowWidth(width);
    return {
      width,
      height,
      fontScale,
      pixelRatio: scale,
      bucket: responsiveBucket(width),
      compactHeight,
      narrow,
      pagePad: pageHorizontalPad(width),
      fontBucket: fontScaleBucket(fontScale),
      densityLabel: pixelDensityLabel(),
      contentMaxWidth: contentMaxWidthStyle(width),
      dayMapMinHeight: dayMapMinHeight(height, { compactSummary: compactHeight })
    };
  }, [fontScale, height, scale, width]);
}
