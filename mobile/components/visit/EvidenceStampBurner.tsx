import { useCallback, useEffect, useRef, useState } from "react";
import { Image, PixelRatio, StyleSheet, Text, View } from "react-native";
import { captureWatermarkedPhoto, getImageDimensions } from "../../../src/utils/captureWatermarkedPhoto";
import {
  buildEvidenceStampLines,
  type EvidenceStampMeta
} from "../../../src/utils/visitPhotoWatermark";
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
 */
export function EvidenceStampBurner({ job, onComplete, onError }: Props) {
  const viewRef = useRef<View>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    if (!job) {
      setDims(null);
      return;
    }
    setDims(null);
    void getImageDimensions(job.sourceUri)
      .then(setDims)
      .catch(() => setDims({ width: 1200, height: 1600 }));
  }, [job]);

  const capture = useCallback(async () => {
    if (!job || !dims || inFlight.current === job.id) return;
    inFlight.current = job.id;
    try {
      const maxEdge = 1600;
      const scale = Math.min(1, maxEdge / Math.max(dims.width, dims.height));
      const width = Math.max(1, Math.round(dims.width * scale));
      const height = Math.max(1, Math.round(dims.height * scale));
      await new Promise((resolve) => setTimeout(resolve, 80));
      const stampedUri = await captureWatermarkedPhoto({
        viewRef,
        imageWidth: width,
        imageHeight: height,
        sourceUri: job.sourceUri
      });
      onComplete(job.id, stampedUri);
    } catch (err) {
      onError(job.id, err instanceof Error ? err.message : "Could not stamp photo.");
    } finally {
      if (inFlight.current === job.id) inFlight.current = null;
    }
  }, [dims, job, onComplete, onError]);

  useEffect(() => {
    if (job && dims) {
      void capture();
    }
  }, [capture, dims, job]);

  if (!job || !dims) return null;

  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(dims.width, dims.height));
  const width = Math.max(1, Math.round(dims.width * scale));
  const height = Math.max(1, Math.round(dims.height * scale));
  const lines = buildEvidenceStampLines(job.meta);
  const fontSize = Math.max(18, Math.round(width / 42));

  return (
    <View style={styles.offscreen} pointerEvents="none">
      <View
        ref={viewRef}
        collapsable={false}
        style={{ width, height, backgroundColor: "#000" }}
      >
        <Image source={{ uri: job.sourceUri }} style={{ width, height }} resizeMode="cover" />
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
      <Text style={{ fontSize: PixelRatio.get() * 0.1 }}>{width}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    left: -4000,
    position: "absolute",
    top: 0
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
