import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { friendlyPickerCancel } from "./visitAttachmentFiles";
import { prepareProfileImageForUpload } from "./profileImageFiles";

export type PickedProfileImage = {
  uri: string;
  name: string;
  mimeType: string;
};

export function handleProfilePickerError(err: unknown): string | null {
  if (friendlyPickerCancel(err)) return null;
  if (err instanceof Error) return err.message;
  return "Could not open photo picker.";
}

export async function pickProfileImage(source: "camera" | "library"): Promise<PickedProfileImage | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission", "Allow camera access to take a profile photo.");
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1]
    });
    if (result.canceled || !result.assets[0]) return null;
    return prepareProfileImageForUpload(result.assets[0].uri);
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Gallery permission", "Allow photo library access to choose a profile photo.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9,
    allowsEditing: true,
    aspect: [1, 1],
    allowsMultipleSelection: false
  });
  if (result.canceled || !result.assets[0]) return null;
  return prepareProfileImageForUpload(result.assets[0].uri);
}

export function showProfilePhotoSourcePicker(onPick: (source: "camera" | "library") => void) {
  Alert.alert("Profile photo", "Choose a source", [
    { text: "Camera", onPress: () => onPick("camera") },
    { text: "Gallery", onPress: () => onPick("library") },
    { text: "Cancel", style: "cancel" }
  ]);
}
