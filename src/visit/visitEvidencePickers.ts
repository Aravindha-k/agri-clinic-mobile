import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import {
  assertFileUnderLimit,
  friendlyPickerCancel,
  inferAttachmentType,
  prepareImageForUpload
} from "../utils/visitAttachmentFiles";
import { createPendingAttachmentId, PendingVisitAttachment } from "./pendingAttachments";

/** Returns raw image URI — caller applies GPS watermark preview before upload. */
export async function pickPendingImageUri(source: "camera" | "library"): Promise<string | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission", "Allow camera access to take visit photos.");
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false
    });
    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0].uri;
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Gallery permission", "Allow photo library access to attach images.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsMultipleSelection: false
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

/** @deprecated Use pickPendingImageUri + watermark preview flow */
export async function pickPendingImage(source: "camera" | "library"): Promise<PendingVisitAttachment | null> {
  const uri = await pickPendingImageUri(source);
  if (!uri) return null;
  const prepared = await prepareImageForUpload(uri);
  return {
    id: createPendingAttachmentId(),
    attachmentType: "image",
    uri: prepared.uri,
    name: prepared.name,
    mimeType: prepared.mimeType,
    createdAt: new Date().toISOString()
  };
}

export async function pickPendingDocument(): Promise<PendingVisitAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ["application/pdf", "audio/*", "text/*", "application/*", "image/*"]
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const name = asset.name || `file-${Date.now()}`;
  const mime = asset.mimeType || "application/octet-stream";
  const attachmentType = inferAttachmentType(name, mime);
  await assertFileUnderLimit(asset.uri, name);
  return {
    id: createPendingAttachmentId(),
    attachmentType,
    uri: asset.uri,
    name,
    mimeType: mime,
    createdAt: new Date().toISOString()
  };
}

export function createPendingTextNote(text: string): PendingVisitAttachment {
  return {
    id: createPendingAttachmentId(),
    attachmentType: "text",
    textContent: text.trim(),
    createdAt: new Date().toISOString()
  };
}

export async function startVoiceRecording(): Promise<Audio.Recording | null> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Microphone permission", "Allow microphone access to record voice notes.");
    return null;
  }
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const rec = new Audio.Recording();
  await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await rec.startAsync();
  return rec;
}

export async function finishVoiceRecording(recording: Audio.Recording): Promise<PendingVisitAttachment | null> {
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  if (!uri) return null;
  const name = `voice-${Date.now()}.m4a`;
  await assertFileUnderLimit(uri, "Voice note");
  return {
    id: createPendingAttachmentId(),
    attachmentType: "audio",
    uri,
    name,
    mimeType: "audio/m4a",
    createdAt: new Date().toISOString()
  };
}

export function handlePickerError(err: unknown): string | null {
  if (friendlyPickerCancel(err)) return null;
  return err instanceof Error ? err.message : "Unable to add attachment.";
}
