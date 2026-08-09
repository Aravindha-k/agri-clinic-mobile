import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { uploadFarmerPhoto } from "../../../src/api/profilePhotos";
import type { Farmer } from "../../../src/api/farmers";
import {
  cacheBustPhotoUrl,
  extractPhotoUrl,
  initialsFromName
} from "../../../src/utils/profilePhotoUrl";
import {
  handleProfilePickerError,
  pickProfileImage,
  showProfilePhotoSourcePicker
} from "../../../src/utils/profileImagePick";
import { logFailedMediaUrl } from "../../../src/utils/resolveMediaUrl";
import { Colors, FontWeight, Radius } from "../../lib/theme";

type Props = {
  farmer: Farmer;
  onFarmerUpdated?: (farmer: Farmer) => void;
  size?: number;
  style?: ViewStyle;
};

export function FarmerPhotoAvatar({ farmer, onFarmerUpdated, size = 52, style }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [photoVersion, setPhotoVersion] = useState(Date.now());
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const displayName = farmer.name || "Farmer";
  const serverUrl = extractPhotoUrl(farmer);
  const previewUri = localUrl || serverUrl;

  useEffect(() => {
    setImgFailed(false);
  }, [previewUri, photoVersion]);

  async function runPick(source: "camera" | "library") {
    try {
      const picked = await pickProfileImage(source);
      if (!picked || !farmer.id) return;
      // Show local preview immediately — do not wait for remote URL.
      setLocalUrl(picked.uri);
      setPhotoVersion(Date.now());
      setImgFailed(false);
      setUploading(true);
      setProgress(0);
      const result = await uploadFarmerPhoto(farmer.id, picked, setProgress);
      let url = result.photo_url || extractPhotoUrl(result.entity) || null;
      let entity = result.entity;

      if (!url && farmer.id) {
        try {
          const { refreshFarmer } = await import("../../../src/api/profilePhotos");
          const refreshed = await refreshFarmer(farmer.id);
          entity = refreshed;
          url = extractPhotoUrl(refreshed);
        } catch {
          /* keep optimistic local preview */
        }
      }

      if (url) {
        setLocalUrl(url);
        setPhotoVersion(Date.now());
      }

      if (entity && typeof entity === "object" && "id" in entity) {
        onFarmerUpdated?.(entity as Farmer);
      }

      if (!url && !extractPhotoUrl(entity)) {
        Alert.alert(
          "Photo uploaded",
          "The photo was saved but could not be refreshed yet. Pull to refresh if it does not appear."
        );
      }
    } catch (err) {
      setLocalUrl(null);
      Alert.alert("Upload failed", handleProfilePickerError(err) || "Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  const uri =
    previewUri && !imgFailed ? cacheBustPhotoUrl(previewUri, photoVersion) : null;

  return (
    <Pressable
      onPress={() => showProfilePhotoSourcePicker((source) => void runPick(source))}
      accessibilityRole="button"
      accessibilityLabel="Change farmer photo"
      style={[styles.wrap, { width: size, height: size, borderRadius: 18 }, style]}
    >
      <View style={[styles.inner, { backgroundColor: Colors.brand50, borderRadius: 18 }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: 18 }}
            resizeMode="cover"
            onError={() => {
              logFailedMediaUrl(previewUri, "FarmerPhotoAvatar");
              setImgFailed(true);
            }}
          />
        ) : (
          <Text style={styles.initials}>{initialsFromName(displayName)}</Text>
        )}
      </View>
      {uploading ? (
        <View style={[styles.overlay, { borderRadius: 18 }]}>
          <ActivityIndicator color={Colors.surface} />
          {progress > 0 ? (
            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.editBadge}>
          <Ionicons name="camera-outline" size={12} color={Colors.brand700} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden"
  },
  inner: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%"
  },
  initials: {
    color: Colors.brand700,
    fontSize: 18,
    fontWeight: FontWeight.bold
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: Colors.photoOverlay,
    justifyContent: "center"
  },
  progressText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    marginTop: 4
  },
  editBadge: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    bottom: 2,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    width: 22
  }
});
