import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useVisitAttachments } from "../../hooks/useVisitAttachments";
import { useVisitPhotoWithWatermark } from "../../hooks/useVisitPhotoWithWatermark";
import { useTheme } from "../../theme";
import { listCardType } from "../../theme/listCard";
import { pickPendingImageUri } from "../../visit/visitEvidencePickers";
import { buildVisitPhotoWatermarkMeta } from "../../utils/buildVisitPhotoWatermarkMeta";
import {
  assertFileUnderLimit,
  friendlyPickerCancel,
  friendlyUploadError,
  inferAttachmentType,
  prepareImageForUpload
} from "../../utils/visitAttachmentFiles";
import { getForegroundLocation } from "../../utils/location";
import { ClinicCard } from "../brand/ClinicCard";
import { AttachmentCard } from "./AttachmentCard";
import { TextNoteModal } from "./TextNoteModal";
import { VisitPhotoWatermarkPreview } from "./VisitPhotoWatermarkPreview";

type WatermarkContext = {
  village?: string | null;
  district?: string | null;
  land_name?: string | null;
  farmer_name?: string | null;
  employeeName?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type Props = {
  visitId: number | null | undefined;
  watermarkContext?: WatermarkContext;
  /** Load attachments when section mounts / screen focuses */
  autoLoad?: boolean;
  compact?: boolean;
};

export function VisitEvidenceSection({ visitId, watermarkContext, autoLoad = true, compact }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const {
    attachments,
    loading,
    error,
    uploading,
    deletingId,
    canManage,
    refresh,
    uploadFile,
    uploadPhotoPair,
    uploadText,
    remove,
    setError
  } = useVisitAttachments(visitId);
  const {
    previewVisible,
    previewImageUri,
    previewMeta,
    openPreview,
    closePreview,
    buildAttachment
  } = useVisitPhotoWithWatermark();

  const [textModalVisible, setTextModalVisible] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void recording?.stopAndUnloadAsync();
    };
  }, [recording]);

  useFocusEffect(
    useCallback(() => {
      if (autoLoad && canManage) {
        void refresh();
      }
    }, [autoLoad, canManage, refresh])
  );

  const runUpload = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch {
        // error surfaced via hook state
      }
    },
    []
  );

  async function pickImage(source: "camera" | "library") {
    setError("");
    try {
      const uri = await pickPendingImageUri(source);
      if (!uri) return;
      let lat = watermarkContext?.latitude ?? null;
      let lng = watermarkContext?.longitude ?? null;
      if (lat == null || lng == null) {
        try {
          const loc = await getForegroundLocation();
          if (loc.granted) {
            lat = loc.location.coords.latitude;
            lng = loc.location.coords.longitude;
          }
        } catch {
          // optional GPS
        }
      }
      const meta = buildVisitPhotoWatermarkMeta({
        values: watermarkContext,
        employeeName: watermarkContext?.employeeName,
        visitId,
        latitude: lat,
        longitude: lng
      });
      openPreview(uri, meta);
    } catch (err) {
      if (friendlyPickerCancel(err)) return;
      setError(friendlyUploadError(err));
    }
  }

  function showPhotoOptions() {
    Alert.alert("Add photo", "GPS watermark preview before upload.", [
      { text: "Camera", onPress: () => void runUpload(() => pickImage("camera")) },
      { text: "Gallery", onPress: () => void runUpload(() => pickImage("library")) },
      { text: "Cancel", style: "cancel" }
    ]);
  }

  async function pickDocument() {
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ["application/pdf", "audio/*", "text/*", "application/*", "image/*"]
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const name = asset.name || `file-${Date.now()}`;
      const mime = asset.mimeType || "application/octet-stream";
      const attachmentType = inferAttachmentType(name, mime);
      await assertFileUnderLimit(asset.uri, name);
      await uploadFile({
        uri: asset.uri,
        name,
        mimeType: mime,
        attachmentType
      });
    } catch (err) {
      if (friendlyPickerCancel(err)) return;
      setError(friendlyUploadError(err));
    }
  }

  async function startVoiceRecording() {
    setError("");
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Microphone permission", "Allow microphone access to record voice notes.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start recording.");
    }
  }

  async function stopVoiceRecording() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (!uri) {
        setError("Recording failed. Please try again.");
        return;
      }
      const name = `voice-${Date.now()}.m4a`;
      await assertFileUnderLimit(uri, "Voice note");
      await uploadFile({
        uri,
        name,
        mimeType: "audio/m4a",
        attachmentType: "audio"
      });
    } catch (err) {
      setIsRecording(false);
      setRecording(null);
      setError(friendlyUploadError(err));
    }
  }

  function confirmDelete(id: number) {
    Alert.alert("Delete attachment?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void runUpload(() => remove(id))
      }
    ]);
  }

  if (!canManage) {
    return (
      <ClinicCard>
        <Text style={[listCardType.meta, { color: c.muted }]}>
          Save the visit online first, then you can add photos, files, and notes as evidence.
        </Text>
      </ClinicCard>
    );
  }

  return (
    <>
    <ClinicCard style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: c.muted }]}>Visit evidence / attachments</Text>

      <View style={styles.actionsGrid}>
        <ActionChip
          icon="camera-outline"
          label="Add photo"
          color={c}
          disabled={Boolean(uploading) || isRecording}
          onPress={showPhotoOptions}
        />
        <ActionChip
          icon="folder-open-outline"
          label="Upload file"
          color={c}
          disabled={Boolean(uploading) || isRecording}
          onPress={() => void runUpload(pickDocument)}
        />
        <ActionChip
          icon="create-outline"
          label="Text note"
          color={c}
          disabled={Boolean(uploading) || isRecording}
          onPress={() => setTextModalVisible(true)}
        />
        <ActionChip
          icon={isRecording ? "stop-circle" : "mic-outline"}
          label={isRecording ? "Stop" : "Voice note"}
          color={c}
          active={isRecording}
          disabled={Boolean(uploading) && !isRecording}
          onPress={() => void (isRecording ? stopVoiceRecording() : startVoiceRecording())}
        />
      </View>

      {uploading ? (
        <View style={[styles.progressBar, { backgroundColor: c.cardMuted, borderColor: c.border }]}>
          <View style={styles.progressTop}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={[listCardType.meta, { color: c.text, flex: 1 }]} numberOfLines={1}>
              Uploading {uploading.label}…
            </Text>
            <Text style={[listCardType.caption, { color: c.primary }]}>
              {Math.round(uploading.progress * 100)}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: c.primary, width: `${Math.max(8, uploading.progress * 100)}%` }
              ]}
            />
          </View>
        </View>
      ) : null}

      {error ? (
        <Pressable
          onPress={() => setError("")}
          style={[styles.errorBanner, { backgroundColor: c.dangerSoft, borderColor: c.danger }]}
        >
          <Ionicons name="alert-circle-outline" size={18} color={c.danger} />
          <Text style={[listCardType.caption, { color: c.danger, flex: 1 }]}>{error}</Text>
        </Pressable>
      ) : null}

      {loading && attachments.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={c.primary} />
          <Text style={[listCardType.meta, { color: c.muted }]}>Loading attachments…</Text>
        </View>
      ) : null}

      {!loading && attachments.length === 0 && !compact ? (
        <Text style={[listCardType.meta, { color: c.muted }]}>
          No evidence yet. Add photos, documents, voice notes, or text for this visit.
        </Text>
      ) : null}

      <View style={styles.list}>
        {attachments.map((item) => (
          <AttachmentCard
            key={item.id}
            attachment={item}
            deleting={deletingId === item.id}
            onDelete={() => confirmDelete(item.id)}
          />
        ))}
      </View>

      <TextNoteModal
        visible={textModalVisible}
        loading={Boolean(uploading)}
        onClose={() => setTextModalVisible(false)}
        onSubmit={async (text) => {
          await runUpload(async () => {
            await uploadText(text);
            setTextModalVisible(false);
          });
        }}
      />
    </ClinicCard>

    {previewImageUri && previewMeta ? (
      <VisitPhotoWatermarkPreview
        visible={previewVisible}
        imageUri={previewImageUri}
        meta={previewMeta}
        onCancel={closePreview}
        onConfirm={(result) => {
          void runUpload(async () => {
            const item = await buildAttachment(result);
            if (item.originalUri && item.originalName && item.originalMimeType && item.uri && item.name && item.mimeType) {
              await uploadPhotoPair(
                {
                  uri: item.uri,
                  name: item.name,
                  mimeType: item.mimeType,
                  attachmentType: "image"
                },
                {
                  uri: item.originalUri,
                  name: item.originalName,
                  mimeType: item.originalMimeType,
                  attachmentType: "image"
                }
              );
            } else if (item.uri && item.name && item.mimeType) {
              await uploadFile({
                uri: item.uri,
                name: item.name,
                mimeType: item.mimeType,
                attachmentType: "image"
              });
            }
            closePreview();
          });
        }}
      />
    ) : null}
    </>
  );
}

function ActionChip({
  icon,
  label,
  color,
  onPress,
  disabled,
  active
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: { primary: string; primarySoft: string; primaryDark: string; card: string; border: string; danger: string };
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? color.primarySoft : color.card,
          borderColor: active ? color.primary : color.border,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1
        }
      ]}
    >
      <Ionicons name={icon} size={20} color={active ? color.primaryDark : color.primary} />
      <Text style={[styles.chipLabel, { color: color.primaryDark }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    minWidth: "47%",
    paddingHorizontal: 10,
    paddingVertical: 12,
    width: "47%"
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  progressBar: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 12
  },
  progressTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  progressTrack: {
    borderRadius: 4,
    height: 6,
    overflow: "hidden",
    width: "100%"
  },
  progressFill: {
    borderRadius: 4,
    height: 6
  },
  errorBanner: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    padding: 12
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8
  },
  list: { gap: 10 }
});
