import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { alertMediaPermissionDenied } from "../../src/utils/mediaPermissionAlert";
import { captureVisitGps } from "./visit/visitGpsCapture";
import { reverseGeocodeAddress } from "../../src/utils/reverseGeocode";
import {
  employeeWatermarkId,
  employeeWatermarkParts,
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

/** Copy picker/camera URI into app cache so Android content:// assets stay readable. */
export async function materializeLocalImage(uri: string): Promise<string> {
  const source = String(uri || "").trim();
  if (!source) return source;
  if (source.startsWith("file://") && source.includes("visit-evidence-")) return source;
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return source;
  const dest = `${cacheDir}visit-evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  try {
    await FileSystem.copyAsync({ from: source, to: dest });
    return dest;
  } catch {
    return source;
  }
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
  const employeeParts = employeeWatermarkParts(input.employee);
  return {
    source: input.source,
    locationKind: input.locationKind,
    evidenceTime: input.when,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    address: input.address,
    employeeName: employeeParts.name,
    employeeCode: employeeParts.code,
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
    alertMediaPermissionDenied({
      title: "Camera permission",
      message: "Allow camera access to attach visit photos.",
      canAskAgain: perm.canAskAgain
    });
    return null;
  }
  const picked = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false
  });
  if (picked.canceled || !picked.assets[0]?.uri) return null;

  const originalUri = picked.assets[0].uri;
  const sourceUri = await materializeLocalImage(originalUri);
  // Live evidence requires a fresh GPS fix at capture time — never reuse a
  // cached/old reading and never accept a photo without one.
  const fix = await currentFix();
  if (!fix || fix.latitude == null || fix.longitude == null) {
    if (sourceUri !== originalUri) void deleteTempUri(sourceUri);
    Alert.alert(
      "GPS required",
      "GPS is unavailable or inaccurate. Please move to an open area and retry."
    );
    return null;
  }
  const latitude = fix.latitude;
  const longitude = fix.longitude;
  const address = await addressFor(latitude, longitude);
  const when = fix.capturedAt ? new Date(fix.capturedAt) : new Date();

  return {
    tempId: createPhotoId(),
    sourceUri,
    originalUri,
    name: `visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`,
    mimeType: "image/jpeg",
    meta: buildMeta({
      source: "camera",
      locationKind: "captured",
      latitude,
      longitude,
      accuracy: fix.accuracy ?? null,
      address,
      when,
      employee: options.employee,
      visitId: options.visitId,
      farmerName: options.farmerName
    })
  };
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
    accuracy: prepared.meta.accuracy,
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
