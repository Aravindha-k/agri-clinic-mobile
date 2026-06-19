import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { cacheBustPhotoUrl, initialsFromName } from "../utils/profilePhotoUrl";
import { logFailedMediaUrl } from "../utils/resolveMediaUrl";

export type ProfileAvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

const SIZES: Record<ProfileAvatarSize, number> = {
  xs: 32,
  sm: 40,
  md: 48,
  lg: 64,
  xl: 88,
  xxl: 112
};

type Props = {
  name?: string | null;
  photoUrl?: string | null;
  photoVersion?: string | number | null;
  size?: ProfileAvatarSize;
  editable?: boolean;
  uploading?: boolean;
  uploadProgress?: number;
  onPress?: () => void;
  variant?: "default" | "onPrimary";
  style?: ViewStyle;
};

export function ProfileAvatar({
  name,
  photoUrl,
  photoVersion,
  size = "md",
  editable,
  uploading,
  uploadProgress,
  onPress,
  variant = "default",
  style
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const dim = SIZES[size];
  const initial = initialsFromName(name);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl, photoVersion]);
  const uri = photoUrl && !imgFailed ? cacheBustPhotoUrl(photoUrl, photoVersion) : null;
  const onPrimary = variant === "onPrimary";

  const content = (
    <View
      style={[
        styles.ring,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: onPrimary ? "rgba(255,255,255,0.2)" : c.primarySoft,
          borderColor: onPrimary ? "rgba(255,255,255,0.35)" : c.border
        },
        style
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: dim, height: dim, borderRadius: dim / 2 }}
          resizeMode="cover"
          onError={() => {
            logFailedMediaUrl(photoUrl, "ProfileAvatar");
            setImgFailed(true);
          }}
        />
      ) : (
        <Text
          style={{
            color: onPrimary ? "#FFFFFF" : c.primaryDark,
            fontSize: dim * 0.38,
            fontWeight: "900"
          }}
        >
          {initial}
        </Text>
      )}
      {uploading ? (
        <View style={[styles.overlay, { borderRadius: dim / 2 }]}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          {uploadProgress != null && uploadProgress > 0 ? (
            <Text style={styles.progressText}>{Math.round(uploadProgress * 100)}%</Text>
          ) : null}
        </View>
      ) : null}
      {editable && !uploading ? (
        <View style={[styles.badge, { backgroundColor: c.primary }]}>
          <Ionicons name="camera" size={size === "xs" || size === "sm" ? 12 : 14} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={uploading} accessibilityRole="button" accessibilityLabel="Change photo">
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden"
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center"
  },
  progressText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4
  },
  badge: {
    alignItems: "center",
    borderRadius: 12,
    bottom: 0,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 24
  }
});
