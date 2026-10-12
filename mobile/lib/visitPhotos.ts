import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { alertMediaPermissionDenied } from "../../src/utils/mediaPermissionAlert";

export type VisitPhotoAsset = {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  source?: "camera" | "gallery";
  locationKind?: "captured" | "uploaded";
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  capturedAt?: string;
  address?: string;
  stampFailed?: boolean;
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

/** Gallery evidence is not accepted for visits — kept only to satisfy existing type contracts. */
export async function pickVisitPhotoFromGallery(): Promise<VisitPhotoAsset | null> {
  return null;
}

export async function pickVisitPhotoFromCamera(): Promise<VisitPhotoAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    alertMediaPermissionDenied({
      title: "Camera permission",
      message: "Allow camera access to attach visit photos.",
      canAskAgain: perm.canAskAgain
    });
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
