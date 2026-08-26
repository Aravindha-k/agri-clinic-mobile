import { useCallback, useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { captureWatermarkedPhoto, getImageDimensions } from "../../../src/utils/captureWatermarkedPhoto";
import {
  buildEvidenceStampLines,
  type EvidenceStampMeta
} from "../../../src/utils/visitPhotoWatermark";
import { fitWatermarkCaptureSize } from "../../../src/utils/watermarkCaptureLayout";
import { BRAND_COLORS } from "../../../src/config/brand";

export type EvidenceStampJob = {
  id: string;
  sourceUri: string;
  meta: EvidenceStampMeta;
};

type Props = {
  job: EvidenceStampJob | null;
  onComplete: (id: string, stampedUri: string) => void;
  onError: (id: string, message: string) => void;
};

/**
 * Off-screen burner: same overlay as preview, captured into a JPEG via view-shot.
 * Waits for Image onLoad before capture. Keeps the view on-screen (opacity 0) so
 * Android composites the bitmap — far off-screen + black bg was producing black JPEGs.
 */
export function EvidenceStampBurner({ job, onComplete, onError }: Props) {
  const viewRef = useRef<View>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const inFlight = useRef<string | null>(null);
  const imageLoadedRef = useRef(false);

  useEffect(() => {
    if (!job) {
      setDims(null);
      setImageReady(false);
      imageLoadedRef.current = false;
      return;
    }
    setDims(null);
    setImageReady(false);
    imageLoadedRef.current = false;
    let cancelled = false;
    void getImageDimensions(job.sourceUri)
      .then((size) => {
        if (!cancelled) setDims(size);
      })
      .catch(() => {
        if (!cancelled) setDims({ width: 1200, height: 1600 });
      });
    const loadTimeout = setTimeout(() => {
      if (!cancelled && !imageLoadedRef.current) {
        onError(job.id, "Photo took too long to load for watermark. Please retake.");
      }
    }, 12_000);
    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
    };
  }, [job, onError]);

  const capture = useCallback(async () => {
    if (!job || !dims || !imageReady || inFlight.current === job.id) return;
    inFlight.current = job.id;
    try {
      const captureSize = fitWatermarkCaptureSize(dims.width, dims.height);
      // One frame after onLoad so layout/paint settle before view-shot.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const stampedUri = await captureWatermarkedPhoto({
        viewRef,
        imageWidth: dims.width,
        imageHeight: dims.height,
        captureSize,
        sourceUri: job.sourceUri
      });
      onComplete(job.id, stampedUri);
    } catch (err) {
      onError(job.id, err instanceof Error ? err.message : "Could not stamp photo.");
    } finally {
      if (inFlight.current === job.id) inFlight.current = null;
    }
  }, [dims, imageReady, job, onComplete, onError]);

  useEffect(() => {
    if (job && dims && imageReady) {
      void capture();
    }
  }, [capture, dims, imageReady, job]);

  if (!job || !dims) return null;

  const captureSize = fitWatermarkCaptureSize(dims.width, dims.height);
  const { layoutWidth: width, layoutHeight: height } = captureSize;
  const lines = buildEvidenceStampLines(job.meta);
  const fontSize = Math.max(18, Math.round(width / 42));

  return (
    <View style={styles.captureHost} pointerEvents="none" accessibilityElementsHidden>
      <View
        ref={viewRef}
        collapsable={false}
        style={{ width, height, backgroundColor: "#111111" }}
      >
        <Image
          source={{ uri: job.sourceUri }}
          style={{ width, height }}
          resizeMode="cover"
          onLoad={() => {
            imageLoadedRef.current = true;
            setImageReady(true);
          }}
          onError={() => {
            imageLoadedRef.current = true;
            setImageReady(false);
            onError(job.id, "Could not load photo for watermark.");
          }}
        />
        <View style={styles.panel}>
          {lines.map((line, index) => (
            <Text
              key={`${job.id}-${index}`}
              style={[styles.line, { fontSize, lineHeight: fontSize + 6 }]}
              numberOfLines={3}
            >
              {line}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Must remain in the compositor (opacity 0, not translated far off-screen).
   * Android often skips drawing Images that are thousands of px off-screen → black JPEG.
   */
  captureHost: {
    opacity: 0,
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: -1
  },
  panel: {
    backgroundColor: "rgba(11, 20, 16, 0.72)",
    bottom: 0,
    left: 0,
    paddingHorizontal: 28,
    paddingVertical: 22,
    position: "absolute",
    right: 0
  },
  line: {
    color: BRAND_COLORS.accent,
    fontWeight: "800",
    marginTop: 3,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  }
});
