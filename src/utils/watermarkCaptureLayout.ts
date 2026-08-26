/**
 * Image.getSize returns file pixels. RN style width/height are density-independent.
 * Never treat raw getSize values as dp and then multiply again by PixelRatio in view-shot —
 * that oversizes the capture buffer and can produce black/corrupt JPEGs on Android.
 */

export const WATERMARK_CAPTURE_MAX_EDGE = 1600;

export type CaptureLayoutSize = {
  /** Layout size for the off-screen capture View (dp-safe capped pixels). */
  layoutWidth: number;
  layoutHeight: number;
  /** Output JPEG size passed to view-shot (same as layout; no PixelRatio multiply). */
  outputWidth: number;
  outputHeight: number;
};

/** Cap the long edge; preserve aspect ratio; never return zero. */
export function fitWatermarkCaptureSize(
  imageWidth: number,
  imageHeight: number,
  maxEdge = WATERMARK_CAPTURE_MAX_EDGE
): CaptureLayoutSize {
  const srcW = Math.max(1, Math.round(Number(imageWidth) || 1));
  const srcH = Math.max(1, Math.round(Number(imageHeight) || 1));
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  return {
    layoutWidth: width,
    layoutHeight: height,
    outputWidth: width,
    outputHeight: height
  };
}
