import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";
import { listCardType } from "../../theme/listCard";
import { useVisitFlow } from "../../visit/VisitFlowContext";
import {
  createPendingTextNote,
  finishVoiceRecording,
  handlePickerError,
  pickPendingDocument,
  pickPendingImage,
  startVoiceRecording
} from "../../visit/visitEvidencePickers";
import { PremiumCard } from "../brand/PremiumCard";
import { PendingAttachmentCard } from "./PendingAttachmentCard";
import { TextNoteModal } from "./TextNoteModal";

export function VisitDraftEvidenceSection() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { pendingAttachments, addPendingAttachment, removePendingAttachment } = useVisitFlow();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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

  const runPick = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, []);

  function showPhotoOptions() {
    Alert.alert("Add photo", "Choose a source", [
      {
        text: "Camera",
        onPress: () =>
          void runPick(async () => {
            try {
              const item = await pickPendingImage("camera");
              if (item) addPendingAttachment(item);
            } catch (err) {
              const msg = handlePickerError(err);
              if (msg) setError(msg);
            }
          })
      },
      {
        text: "Gallery",
        onPress: () =>
          void runPick(async () => {
            try {
              const item = await pickPendingImage("library");
              if (item) addPendingAttachment(item);
            } catch (err) {
              const msg = handlePickerError(err);
              if (msg) setError(msg);
            }
          })
      },
      { text: "Cancel", style: "cancel" }
    ]);
  }

  return (
    <PremiumCard elevated tint="soft" style={styles.card}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>Visit evidence / attachments</Text>
      <Text style={[listCardType.meta, { color: c.muted }]}>
        Add photos, files, or notes now. Everything uploads when you submit the visit.
      </Text>

      <View style={styles.actionsGrid}>
        <ActionChip
          icon="camera-outline"
          label="Add photo"
          color={c}
          disabled={busy || isRecording}
          onPress={showPhotoOptions}
        />
        <ActionChip
          icon="folder-open-outline"
          label="Upload file"
          color={c}
          disabled={busy || isRecording}
          onPress={() =>
            void runPick(async () => {
              try {
                const item = await pickPendingDocument();
                if (item) addPendingAttachment(item);
              } catch (err) {
                const msg = handlePickerError(err);
                if (msg) setError(msg);
              }
            })
          }
        />
        <ActionChip
          icon="create-outline"
          label="Text note"
          color={c}
          disabled={busy || isRecording}
          onPress={() => setTextModalVisible(true)}
        />
        <ActionChip
          icon={isRecording ? "stop-circle" : "mic-outline"}
          label={isRecording ? "Stop" : "Voice note"}
          color={c}
          active={isRecording}
          disabled={busy && !isRecording}
          onPress={() =>
            void runPick(async () => {
              try {
                if (isRecording && recording) {
                  const item = await finishVoiceRecording(recording);
                  setRecording(null);
                  setIsRecording(false);
                  if (item) addPendingAttachment(item);
                  return;
                }
                const rec = await startVoiceRecording();
                if (rec) {
                  setRecording(rec);
                  setIsRecording(true);
                }
              } catch (err) {
                setIsRecording(false);
                setRecording(null);
                const msg = handlePickerError(err);
                if (msg) setError(msg);
              }
            })
          }
        />
      </View>

      {busy ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={[listCardType.meta, { color: c.muted }]}>Preparing attachment…</Text>
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

      {pendingAttachments.length === 0 ? (
        <Text style={[listCardType.caption, { color: c.muted }]}>No evidence added yet (optional).</Text>
      ) : (
        <Text style={[listCardType.caption, { color: c.primary }]}>
          {pendingAttachments.length} item{pendingAttachments.length === 1 ? "" : "s"} ready to upload
        </Text>
      )}

      <View style={styles.list}>
        {pendingAttachments.map((item) => (
          <PendingAttachmentCard
            key={item.id}
            item={item}
            onDelete={() => removePendingAttachment(item.id)}
          />
        ))}
      </View>

      <TextNoteModal
        visible={textModalVisible}
        loading={busy}
        onClose={() => setTextModalVisible(false)}
        onSubmit={(text) => {
          addPendingAttachment(createPendingTextNote(text));
          setTextModalVisible(false);
        }}
      />
    </PremiumCard>
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
  color: { primary: string; primarySoft: string; primaryDark: string; card: string; border: string };
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
  card: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "900" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  chipLabel: { fontSize: 12, fontWeight: "800", textAlign: "center" },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  errorBanner: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    padding: 12
  },
  list: { gap: 10 }
});
