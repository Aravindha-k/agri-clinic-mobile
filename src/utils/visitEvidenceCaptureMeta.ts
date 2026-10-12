import type { VisitPhotoAsset } from "../../mobile/lib/visitPhotos";

/**
 * Append server-validated live-capture metadata to a media upload.
 * The backend requires these fields on employee image evidence; omitting them
 * rejects the upload. `capture_source` is always "camera" — gallery/library
 * evidence is not accepted for visits.
 */
export function appendCaptureMetaToForm(formData: FormData, photo: VisitPhotoAsset) {
  formData.append("capture_source", photo.source === "camera" ? "camera" : (photo.source ?? "camera"));
  if (photo.latitude != null) formData.append("capture_latitude", String(photo.latitude));
  if (photo.longitude != null) formData.append("capture_longitude", String(photo.longitude));
  if (photo.accuracy != null) formData.append("capture_accuracy_m", String(photo.accuracy));
  if (photo.capturedAt) formData.append("captured_at", photo.capturedAt);
}
