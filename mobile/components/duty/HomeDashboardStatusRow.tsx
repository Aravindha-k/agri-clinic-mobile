import { Image, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { ProfilePhotoFallback } from "../../../src/components/ProfilePhotoFallback";
import { cacheBustPhotoUrl, extractPhotoUrl } from "../../../src/utils/profilePhotoUrl";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { GpsStatusBadge } from "../duty/GpsStatusBadge";
import { SyncStatusBadge } from "../duty/SyncStatusBadge";

type Props = {
  photoUrl: string | null;
  photoVersion: string | number;
  offline?: boolean;
  pendingSync?: number;
  gpsEnabled?: boolean;
  permissionDenied?: boolean;
};

export function HomeDashboardStatusRow({
  photoUrl,
  photoVersion,
  offline,
  pendingSync,
  gpsEnabled,
  permissionDenied
}: Props) {
  const { t } = useI18n();
  const uri = photoUrl ? cacheBustPhotoUrl(photoUrl, photoVersion) : null;
  const size = 48;

  return (
    <View style={styles.row}>
      <View style={styles.avatarShell}>
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />
        ) : (
          <ProfilePhotoFallback size={size} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{t("home.fieldOperations")}</Text>
        <View style={styles.badges}>
          <GpsStatusBadge gpsEnabled={gpsEnabled} permissionDenied={permissionDenied} />
          <SyncStatusBadge offline={offline} pendingCount={pendingSync} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    marginHorizontal: Spacing.screen,
    marginTop: Spacing.md
  },
  avatarShell: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  },
  copy: {
    flex: 1,
    gap: Spacing.xs
  },
  label: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs
  }
});
