import * as ImageManipulator from "expo-image-manipulator";
import { Image, PixelRatio } from "react-native";
import type { RefObject } from "react";
import type { View } from "react-native";
import { assertFileUnderLimit, prepareImageForUpload } from "./visitAttachmentFiles";
import { isExpoGo } from "./expoRuntime";

export type WatermarkCaptureTarget = {
  viewRef: RefObject<View | null>;
  imageWidth: number;
  imageHeight: number;
  /** Required for Expo Go fallback (no react-native-view-shot). */
  sourceUri?: string;
};

export function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err)
    );
  });
}

/** Capture composed photo + watermark overlay from an off-screen preview view. */
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

  const scale = PixelRatio.get();
  const uri = await captureRef(ref, {
    format: "jpg",
    quality: 0.88,
    width: Math.round(target.imageWidth * scale),
    height: Math.round(target.imageHeight * scale)
  });

  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1920 } }],
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
  );

  await assertFileUnderLimit(compressed.uri, "Photo");
  return compressed.uri;
}
