import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { EvidencePhotoFooter } from "./EvidencePhotoFooter";
import { captureWatermarkedPhoto, getImageDimensions } from "../../utils/captureWatermarkedPhoto";
import {
  EVIDENCE_PHOTO_RESIZE_MODE,
  evidenceCaptureHostStyle
} from "../../utils/evidenceCaptureHostLayout";
import { isExpoGo } from "../../utils/expoRuntime";
import { fitEvidencePhotoCaptureSize } from "../../utils/evidencePhotoFooter";
import {
  type EvidenceStampMeta,
  type VisitPhotoWatermarkMeta
} from "../../utils/visitPhotoWatermark";
import { useTheme } from "../../theme";

export type WatermarkPreviewResult = {
  watermarkedUri: string;
  originalUri: string;
};

type Props = {
  visible: boolean;
  imageUri: string;
  meta: VisitPhotoWatermarkMeta;
  onCancel: () => void;
  onConfirm: (result: WatermarkPreviewResult) => void;
};

const PREVIEW_WIDTH = 320;

function toEvidenceStampMeta(meta: VisitPhotoWatermarkMeta): EvidenceStampMeta {
  const visitId = meta.visitId?.trim().replace(/^#/, "") || undefined;
  return {
    source: "camera",
    locationKind: "captured",
    evidenceTime: meta.capturedAt ?? new Date(),
    latitude: meta.latitude,
    longitude: meta.longitude,
    accuracy: null,
    address: meta.address,
    employeeName: meta.employeeName,
    employeeCode: "",
    employeeDisplayId: meta.employeeName,
    visitId
  };
}

export function VisitPhotoWatermarkPreview({ visible, imageUri, meta, onCancel, onConfirm }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const captureRefView = useRef<View>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const [captureImageReady, setCaptureImageReady] = useState(false);
  const [stampedPreviewUri, setStampedPreviewUri] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const burnInFlight = useRef(false);

  const stampMeta = toEvidenceStampMeta(meta);
  const captureSize = dims ? fitEvidencePhotoCaptureSize(dims.width, dims.height, stampMeta) : null;
  const previewScale = captureSize ? PREVIEW_WIDTH / captureSize.layoutWidth : 1;
  const previewHeight = captureSize ? Math.round(captureSize.layoutHeight * previewScale) : 220;

  useEffect(() => {
    if (!visible || !imageUri) return;
    setError("");
    setDims(null);
    setCaptureImageReady(false);
    setStampedPreviewUri(null);
    burnInFlight.current = false;
    void getImageDimensions(imageUri)
      .then(setDims)
      .catch(() => setDims({ width: 1200, height: 1600 }));
  }, [imageUri, visible]);

  const burnPreview = useCallback(async () => {
    if (!dims || !captureSize || !captureImageReady || burnInFlight.current) return;
    burnInFlight.current = true;
    setPreviewBusy(true);
    setError("");
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const watermarkedUri = await captureWatermarkedPhoto({
        viewRef: captureRefView,
        imageWidth: dims.width,
        imageHeight: dims.height,
        captureSize,
        sourceUri: imageUri
      });
      setStampedPreviewUri(watermarkedUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply watermark.");
      setStampedPreviewUri(null);
    } finally {
      setPreviewBusy(false);
      burnInFlight.current = false;
    }
  }, [captureImageReady, captureSize, dims, imageUri]);

  useEffect(() => {
    if (visible && dims && captureSize && captureImageReady && !stampedPreviewUri) {
      void burnPreview();
    }
  }, [burnPreview, captureImageReady, captureSize, dims, stampedPreviewUri, visible]);

  const handleConfirm = useCallback(() => {
    if (!stampedPreviewUri) {
      setError("Photo is still processing. Please wait a moment.");
      return;
    }
    setBusy(true);
    onConfirm({ watermarkedUri: stampedPreviewUri, originalUri: imageUri });
    setBusy(false);
  }, [imageUri, onConfirm, stampedPreviewUri]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: c.card }]}>
          <Text style={[styles.title, { color: c.text }]}>Proof photo preview</Text>
          <Text style={[styles.sub, { color: c.muted }]}>
            {isExpoGo()
              ? "Expo Go: preview only — footer is burned in on the APK/dev build. Photo will still upload."
              : "Preview shows the exact JPEG that will be uploaded."}
          </Text>

          <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.previewFrame, { borderColor: c.border }]}>
              {stampedPreviewUri ? (
                <Image
                  source={{ uri: stampedPreviewUri }}
                  style={{ width: PREVIEW_WIDTH, height: previewHeight }}
                  resizeMode={EVIDENCE_PHOTO_RESIZE_MODE}
                />
              ) : (
                <View
                  style={{
                    width: PREVIEW_WIDTH,
                    height: previewHeight,
                    backgroundColor: "#F3F4F6",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <ActivityIndicator color={c.primary} />
                </View>
              )}
            </View>
          </ScrollView>

          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              disabled={busy || previewBusy}
              style={[styles.btnGhost, { borderColor: c.border }]}
            >
              <Text style={{ color: c.text, fontWeight: "700" }}>Retake</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleConfirm}
              disabled={busy || previewBusy || !stampedPreviewUri}
              style={[
                styles.btnPrimary,
                {
                  backgroundColor: c.primary,
                  opacity: busy || previewBusy || !stampedPreviewUri ? 0.6 : 1
                }
              ]}
            >
              {busy || previewBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.btnPrimaryText}>Use watermarked photo</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {dims && captureSize ? (
          <View
            style={[styles.captureHost, evidenceCaptureHostStyle()]}
            pointerEvents="none"
            accessibilityElementsHidden
          >
            <View
              ref={captureRefView}
              collapsable={false}
              style={{
                width: captureSize.layoutWidth,
                height: captureSize.layoutHeight,
                backgroundColor: "#FFFFFF",
                opacity: 1
              }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: captureSize.layoutWidth,
                  height: captureSize.photoLayoutHeight,
                  opacity: 1
                }}
                resizeMode={EVIDENCE_PHOTO_RESIZE_MODE}
                onLoad={() => setCaptureImageReady(true)}
                onError={() => {
                  setCaptureImageReady(false);
                  setError("Could not load photo for watermark.");
                }}
              />
              <EvidencePhotoFooter
                width={captureSize.layoutWidth}
                height={captureSize.footerLayoutHeight}
                meta={stampMeta}
                scale={1}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.55)",
    flex: 1,
    justifyContent: "flex-end"
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "92%",
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 18
  },
  title: { fontSize: 20, fontWeight: "900", letterSpacing: -0.3 },
  sub: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  previewScroll: { marginTop: 14, maxHeight: 360 },
  previewFrame: {
    alignSelf: "center",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden"
  },
  error: { fontSize: 13, fontWeight: "600", marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnGhost: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12
  },
  btnPrimary: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1.4,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12
  },
  btnPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  captureHost: {
    pointerEvents: "none"
  }
});
