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
import { BRAND_COLORS } from "../../brand/constants";
import { captureWatermarkedPhoto, getImageDimensions } from "../../utils/captureWatermarkedPhoto";
import { isExpoGo } from "../../utils/expoRuntime";
import {
  buildVisitPhotoWatermarkLines,
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

export function VisitPhotoWatermarkPreview({ visible, imageUri, meta, onCancel, onConfirm }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const captureRefView = useRef<View>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lines = buildVisitPhotoWatermarkLines(meta);
  const previewHeight = dims ? Math.round((PREVIEW_WIDTH * dims.height) / dims.width) : 220;
  const captureHeight = dims?.height ?? 1200;
  const captureWidth = dims?.width ?? 900;

  useEffect(() => {
    if (!visible || !imageUri) return;
    setError("");
    setDims(null);
    void getImageDimensions(imageUri)
      .then(setDims)
      .catch(() => setDims({ width: 1200, height: 1600 }));
  }, [imageUri, visible]);

  const handleConfirm = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const watermarkedUri = await captureWatermarkedPhoto({
        viewRef: captureRefView,
        imageWidth: captureWidth,
        imageHeight: captureHeight,
        sourceUri: imageUri
      });
      onConfirm({ watermarkedUri, originalUri: imageUri });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply watermark.");
    } finally {
      setBusy(false);
    }
  }, [captureHeight, captureWidth, imageUri, onConfirm]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: c.card }]}>
          <Text style={[styles.title, { color: c.text }]}>Proof photo preview</Text>
          <Text style={[styles.sub, { color: c.muted }]}>
            {isExpoGo()
              ? "Expo Go: preview only — watermark is burned in on the APK/dev build. Photo will still upload."
              : "Confirm the GPS watermark before upload. Original and proof copies are saved for admin review."}
          </Text>

          <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.previewFrame, { borderColor: c.border }]}>
              <View style={{ width: PREVIEW_WIDTH, height: previewHeight }}>
                <Image source={{ uri: imageUri }} style={{ width: PREVIEW_WIDTH, height: previewHeight }} resizeMode="cover" />
                <View style={styles.watermarkStrip}>
                  {lines.map((line) => (
                    <Text key={line} style={styles.watermarkLine} numberOfLines={2}>
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              disabled={busy}
              style={[styles.btnGhost, { borderColor: c.border }]}
            >
              <Text style={{ color: c.text, fontWeight: "700" }}>Retake</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleConfirm()}
              disabled={busy || !dims}
              style={[styles.btnPrimary, { backgroundColor: c.primary, opacity: busy || !dims ? 0.6 : 1 }]}
            >
              {busy ? (
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

        {/* Off-screen capture target — full resolution */}
        {dims ? (
          <View style={styles.offscreen} pointerEvents="none">
            <View
              ref={captureRefView}
              collapsable={false}
              style={{ width: captureWidth, height: captureHeight, backgroundColor: "#000" }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: captureWidth, height: captureHeight }}
                resizeMode="cover"
              />
              <View style={[styles.watermarkStrip, styles.watermarkStripCapture]}>
                {lines.map((line) => (
                  <Text key={`cap-${line}`} style={styles.watermarkLineCapture} numberOfLines={3}>
                    {line}
                  </Text>
                ))}
              </View>
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
  watermarkStrip: {
    backgroundColor: "rgba(11, 90, 56, 0.88)",
    bottom: 0,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
    right: 0
  },
  watermarkStripCapture: {
    paddingHorizontal: 24,
    paddingVertical: 20
  },
  watermarkLine: {
    color: BRAND_COLORS.accent,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    marginTop: 2
  },
  watermarkLineCapture: {
    color: BRAND_COLORS.accent,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: 4
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
  offscreen: {
    left: -9999,
    position: "absolute",
    top: 0
  }
});
