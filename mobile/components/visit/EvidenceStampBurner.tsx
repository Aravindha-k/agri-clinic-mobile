import { useCallback, useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { EvidencePhotoFooter } from "../../../src/components/visit/EvidencePhotoFooter";
import { captureWatermarkedPhoto, getImageDimensions } from "../../../src/utils/captureWatermarkedPhoto";
import {
  EVIDENCE_PHOTO_RESIZE_MODE,
  evidenceCaptureHostStyle
} from "../../../src/utils/evidenceCaptureHostLayout";
import { fitEvidencePhotoCaptureSize } from "../../../src/utils/evidencePhotoFooter";
import type { EvidenceStampMeta } from "../../../src/utils/visitPhotoWatermark";

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
 * Off-screen burner: photo + footer below (no overlay on photo), captured into JPEG via view-shot.
 * Waits for Image onLoad before capture. Capture tree stays composited below the viewport at
 * opacity 1 — never opacity:0 (washed-out JPEG) or far off-screen (black JPEG).
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
      const captureSize = fitEvidencePhotoCaptureSize(dims.width, dims.height, job.meta);
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

  const captureSize = fitEvidencePhotoCaptureSize(dims.width, dims.height, job.meta);
  const { layoutWidth: width, layoutHeight: height, photoLayoutHeight, footerLayoutHeight } =
    captureSize;

  return (
    <View
      style={[styles.captureHost, evidenceCaptureHostStyle()]}
      pointerEvents="none"
      accessibilityElementsHidden
    >
      <View
        ref={viewRef}
        collapsable={false}
        style={{ width, height, backgroundColor: "#FFFFFF", opacity: 1 }}
      >
        <Image
          source={{ uri: job.sourceUri }}
          style={{ width, height: photoLayoutHeight, opacity: 1 }}
          resizeMode={EVIDENCE_PHOTO_RESIZE_MODE}
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
        <EvidencePhotoFooter
          width={width}
          height={footerLayoutHeight}
          meta={job.meta}
          scale={1}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  captureHost: {
    pointerEvents: "none"
  }
});
