import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";
import type { RefObject } from "react";
import type { View } from "react-native";
import { assertFileUnderLimit, getLocalFileSize, prepareImageForUpload } from "./visitAttachmentFiles";
import { isExpoGo } from "./expoRuntime";
import { fitWatermarkCaptureSize, type CaptureLayoutSize } from "./watermarkCaptureLayout";

export type WatermarkCaptureTarget = {
  viewRef: RefObject<View | null>;
  imageWidth: number;
  imageHeight: number;
  /** Required for Expo Go fallback (no react-native-view-shot). */
  sourceUri?: string;
  /**
   * Precomputed layout/output size. When omitted, derived from imageWidth/Height
   * with a long-edge cap (no PixelRatio multiply).
   */
  captureSize?: CaptureLayoutSize;
};

/** Suspicious near-empty JPEG after a failed/black view-shot (bytes, not content). */
const MIN_STAMPED_JPEG_BYTES = 8_192;

export function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err)
    );
  });
}

async function assertStampedFileLooksValid(uri: string) {
  const size = await getLocalFileSize(uri);
  if (size != null && size < MIN_STAMPED_JPEG_BYTES) {
    throw new Error("Watermarked photo looks empty. Please retake the photo.");
  }
  await assertFileUnderLimit(uri, "Photo");
  if (__DEV__ && size != null) {
    // Size only — never log bytes/coords/tokens. SHA-256 requires a later byte-integrity pass.
    console.info("[PERF][VisitPhoto] stamped_jpeg_bytes", size);
  }
}

/**
 * Capture composed photo + watermark overlay from a prepared preview view.
 * Output size matches the View layout (capped) — do not multiply by PixelRatio.
 */
export async function captureWatermarkedPhoto(target: WatermarkCaptureTarget): Promise<string> {
  if (isExpoGo()) {
    if (!target.sourceUri) {
      throw new Error("Photo source missing.");
    }
    const prepared = await prepareImageForUpload(target.sourceUri);
    return prepared.uri;
  }

  let captureRef: typeof import("react-native-view-shot").captureRef;
  try {
    captureRef = require("react-native-view-shot").captureRef;
  } catch {
    throw new Error("Watermark capture is not available. Use a development build or APK.");
  }

  const ref = target.viewRef.current;
  if (!ref) {
    throw new Error("Watermark preview is not ready.");
  }

  const size =
    target.captureSize ??
    fitWatermarkCaptureSize(target.imageWidth, target.imageHeight);

  const uri = await captureRef(ref, {
    format: "jpg",
    quality: 0.88,
    width: size.outputWidth,
    height: size.outputHeight,
    result: "tmpfile"
  });

  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: Math.min(1920, size.outputWidth) } }],
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
  );

  await assertStampedFileLooksValid(compressed.uri);
  return compressed.uri;
}
