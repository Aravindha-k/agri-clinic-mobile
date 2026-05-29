import * as ImageManipulator from "expo-image-manipulator";
import { assertFileUnderLimit, getLocalFileSize } from "./visitAttachmentFiles";

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

export async function assertProfilePhotoUnderLimit(uri: string) {
  const size = await getLocalFileSize(uri);
  if (size != null && size > MAX_PROFILE_PHOTO_BYTES) {
    const mb = (MAX_PROFILE_PHOTO_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(`Photo is too large. Maximum size is ${mb} MB.`);
  }
}

/** Square-friendly crop/compress for profile avatars. */
export async function prepareProfileImageForUpload(uri: string): Promise<{
  uri: string;
  name: string;
  mimeType: string;
}> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    await assertProfilePhotoUnderLimit(manipulated.uri);
    return {
      uri: manipulated.uri,
      name: `profile-${Date.now()}.jpg`,
      mimeType: "image/jpeg"
    };
  } catch {
    await assertProfilePhotoUnderLimit(uri);
    return {
      uri,
      name: `profile-${Date.now()}.jpg`,
      mimeType: "image/jpeg"
    };
  }
}
