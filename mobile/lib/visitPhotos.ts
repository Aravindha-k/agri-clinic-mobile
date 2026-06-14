import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export type VisitPhotoAsset = {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
};

export function createPhotoId() {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function compressVisitPhoto(uri: string): Promise<VisitPhotoAsset> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return {
    id: createPhotoId(),
    uri: manipulated.uri,
    name: `visit-${Date.now()}.jpg`,
    mimeType: "image/jpeg"
  };
}

export async function pickVisitPhotoFromGallery(): Promise<VisitPhotoAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Gallery permission", "Allow photo library access to attach visit photos.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsMultipleSelection: false
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return compressVisitPhoto(result.assets[0].uri);
}

export async function pickVisitPhotoFromCamera(): Promise<VisitPhotoAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Camera permission", "Allow camera access to attach visit photos.");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return compressVisitPhoto(result.assets[0].uri);
}
