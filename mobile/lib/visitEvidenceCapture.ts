import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { captureVisitGps } from "./visit/visitGpsCapture";
import { readGalleryExifLocation } from "../../src/utils/galleryPhotoExif";
import { reverseGeocodeAddress } from "../../src/utils/reverseGeocode";
import {
  employeeWatermarkId,
  type EvidenceLocationKind,
  type EvidenceStampMeta
} from "../../src/utils/visitPhotoWatermark";
import { createPhotoId, type VisitPhotoAsset } from "./visitPhotos";

export const MAX_VISIT_PHOTOS = 5;

export type EvidenceEmployee = {
  employee_id?: string | null;
  username?: string | null;
  full_name?: string | null;
  name?: string | null;
};

export type PreparedEvidencePhoto = {
  tempId: string;
  sourceUri: string;
  originalUri: string;
  meta: EvidenceStampMeta;
  name: string;
  mimeType: string;
};

async function flattenOrientation(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.92,
    format: ImageManipulator.SaveFormat.JPEG
  });
  return result.uri;
}

async function currentFix() {
  const result = await captureVisitGps({ requestPermission: false });
  if (!result.ok) return null;
  return result.coords;
}

async function addressFor(lat: number | null, lng: number | null): Promise<string> {
  if (lat == null || lng == null) return "";
  return (await reverseGeocodeAddress(lat, lng)) ?? "";
}

function buildMeta(input: {
  source: "camera" | "gallery";
  locationKind: EvidenceLocationKind;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;
  when: Date;
  employee: EvidenceEmployee | null;
  visitId?: string;
  farmerName?: string;
}): EvidenceStampMeta {
  return {
    source: input.source,
    locationKind: input.locationKind,
    evidenceTime: input.when,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    address: input.address,
    employeeDisplayId: employeeWatermarkId(input.employee),
    visitId: input.visitId,
    farmerName: input.farmerName
  };
}

export async function prepareCameraEvidence(options: {
  employee: EvidenceEmployee | null;
  visitId?: string;
  farmerName?: string;
}): Promise<PreparedEvidencePhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Camera permission", "Allow camera access to attach visit photos.");
    return null;
  }
  const picked = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false
  });
  if (picked.canceled || !picked.assets[0]?.uri) return null;

  const originalUri = picked.assets[0].uri;
  const sourceUri = await flattenOrientation(originalUri);
  const fix = await currentFix();
  const latitude = fix?.latitude ?? null;
  const longitude = fix?.longitude ?? null;
  const address = await addressFor(latitude, longitude);
  const when = fix?.capturedAt ? new Date(fix.capturedAt) : new Date();

  return {
    tempId: createPhotoId(),
    sourceUri,
    originalUri,
    name: `visit-${Date.now()}.jpg`,
    mimeType: "image/jpeg",
    meta: buildMeta({
      source: "camera",
      locationKind: "captured",
      latitude,
      longitude,
      accuracy: fix?.accuracy ?? null,
      address,
      when,
      employee: options.employee,
      visitId: options.visitId,
      farmerName: options.farmerName
    })
  };
}

export async function prepareGalleryEvidence(options: {
  remaining: number;
  employee: EvidenceEmployee | null;
  visitId?: string;
  farmerName?: string;
}): Promise<PreparedEvidencePhoto[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Gallery permission", "Allow photo library access to attach visit photos.");
    return [];
  }
  const limit = Math.max(1, options.remaining);
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsMultipleSelection: true,
    selectionLimit: limit,
    exif: true
  });
  if (picked.canceled || !picked.assets.length) return [];

  const nowFix = await currentFix();
  const uploadAddress = await addressFor(nowFix?.latitude ?? null, nowFix?.longitude ?? null);
  const prepared: PreparedEvidencePhoto[] = [];

  for (const asset of picked.assets.slice(0, limit)) {
    if (!asset.uri) continue;
    const sourceUri = await flattenOrientation(asset.uri);
    const exif = readGalleryExifLocation(asset.exif as Record<string, unknown> | undefined);
    const hasOriginal = exif != null;
    const latitude = hasOriginal ? exif.latitude : nowFix?.latitude ?? null;
    const longitude = hasOriginal ? exif.longitude : nowFix?.longitude ?? null;
    const address = hasOriginal ? await addressFor(latitude, longitude) : uploadAddress;
    const when = hasOriginal && exif.timestamp ? exif.timestamp : new Date();

    prepared.push({
      tempId: createPhotoId(),
      sourceUri,
      originalUri: asset.uri,
      name: `visit-${Date.now()}-${prepared.length}.jpg`,
      mimeType: "image/jpeg",
      meta: buildMeta({
        source: "gallery",
        locationKind: hasOriginal ? "captured" : "uploaded",
        latitude,
        longitude,
        accuracy: hasOriginal ? null : nowFix?.accuracy ?? null,
        address,
        when,
        employee: options.employee,
        visitId: options.visitId,
        farmerName: options.farmerName
      })
    });
  }
  return prepared;
}

export function toVisitPhotoAsset(
  prepared: PreparedEvidencePhoto,
  stampedUri: string
): VisitPhotoAsset {
  return {
    id: prepared.tempId,
    uri: stampedUri,
    name: prepared.name,
    mimeType: prepared.mimeType,
    source: prepared.meta.source,
    locationKind: prepared.meta.locationKind,
    latitude: prepared.meta.latitude,
    longitude: prepared.meta.longitude,
    capturedAt: prepared.meta.evidenceTime.toISOString(),
    address: prepared.meta.address
  };
}

export async function deleteTempUri(uri: string | null | undefined) {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // temp cleanup is best-effort
  }
}
