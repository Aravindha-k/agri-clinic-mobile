import { uploadFarmerPhoto } from "../api/profilePhotos";
import type { PickedProfileImage } from "../utils/profileImagePick";

export async function uploadPendingFarmerPhotoIfNeeded(
  farmerId: string | undefined,
  pending: PickedProfileImage | null
) {
  if (!pending || !farmerId || !/^\d+$/.test(farmerId.trim())) {
    return;
  }
  await uploadFarmerPhoto(Number(farmerId), pending);
}
