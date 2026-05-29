import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { uploadFarmerPhoto } from "../api/profilePhotos";
import { Farmer } from "../api/farmers";
import { useTheme } from "../theme";
import { extractPhotoUrl } from "../utils/profilePhotoUrl";
import {
  handleProfilePickerError,
  pickProfileImage,
  showProfilePhotoSourcePicker,
  type PickedProfileImage
} from "../utils/profileImagePick";
import { ProfileAvatar } from "./ProfileAvatar";

type Props = {
  farmer: Farmer | null;
  farmerName?: string;
  /** Local photo chosen before farmer is saved (new farmer flow). */
  pendingPhoto?: PickedProfileImage | null;
  onPendingPhotoChange?: (photo: PickedProfileImage | null) => void;
  onFarmerUpdated?: (farmer: Farmer) => void;
  onPhotoUrlChange?: (url: string | null) => void;
  compact?: boolean;
};

export function FarmerPhotoPicker({
  farmer,
  farmerName,
  pendingPhoto,
  onPendingPhotoChange,
  onFarmerUpdated,
  onPhotoUrlChange,
  compact
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [photoVersion, setPhotoVersion] = useState(Date.now());
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  const displayName = farmer?.name || farmerName || "Farmer";
  const serverUrl = extractPhotoUrl(farmer);
  const previewUri = pendingPhoto?.uri || localUrl || serverUrl;

  const runPick = useCallback(
    async (source: "camera" | "library") => {
      try {
        const picked = await pickProfileImage(source);
        if (!picked) return;

        if (farmer?.id) {
          setUploading(true);
          setProgress(0);
          const result = await uploadFarmerPhoto(farmer.id, picked, setProgress);
          const url = result.photo_url || extractPhotoUrl(result.entity) || null;
          setLocalUrl(url);
          setPhotoVersion(Date.now());
          onPhotoUrlChange?.(url);
          if (result.entity && typeof result.entity === "object" && "id" in result.entity) {
            onFarmerUpdated?.(result.entity as Farmer);
          }
          onPendingPhotoChange?.(null);
          Alert.alert("Photo saved", "Farmer profile photo updated.");
        } else {
          onPendingPhotoChange?.(picked);
          setLocalUrl(picked.uri);
          Alert.alert("Photo added", "Photo will upload when the farmer is saved with the visit.");
        }
      } catch (err) {
        Alert.alert("Upload failed", handleProfilePickerError(err) || "Please try again.");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [farmer?.id, onFarmerUpdated, onPendingPhotoChange, onPhotoUrlChange]
  );

  function onPressAvatar() {
    showProfilePhotoSourcePicker((source) => void runPick(source));
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <ProfileAvatar
        name={displayName}
        photoUrl={previewUri}
        photoVersion={photoVersion}
        size={compact ? "lg" : "xl"}
        editable
        uploading={uploading}
        uploadProgress={progress}
        onPress={onPressAvatar}
      />
      <View style={styles.copy}>
        <Text style={[styles.label, { color: c.muted }]}>Farmer photo</Text>
        <Text style={[styles.hint, { color: c.textSecondary }]}>
          {farmer?.id
            ? "Tap to change photo (camera or gallery)."
            : pendingPhoto || localUrl
              ? "Photo ready — uploads when visit is submitted."
              : "Optional — tap to add a photo."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingVertical: 8
  },
  wrapCompact: {
    gap: 12
  },
  copy: {
    flex: 1
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  }
});
