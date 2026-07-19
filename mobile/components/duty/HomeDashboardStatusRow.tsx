import { Image, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { ProfilePhotoFallback } from "../../../src/components/ProfilePhotoFallback";
import { cacheBustPhotoUrl } from "../../../src/utils/profilePhotoUrl";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { GpsStatusBadge } from "../duty/GpsStatusBadge";

type Props = {
  photoUrl: string | null;
  photoVersion: string | number;
  gpsEnabled?: boolean;
  permissionDenied?: boolean;
};

/** Avatar + GPS only — pending sync lives on the workday status card. */
export function HomeDashboardStatusRow({
  photoUrl,
  photoVersion,
  gpsEnabled,
  permissionDenied
}: Props) {
  const { t } = useI18n();
  const uri = photoUrl ? cacheBustPhotoUrl(photoUrl, photoVersion) : null;
  const size = 44;

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
        <GpsStatusBadge gpsEnabled={gpsEnabled} permissionDenied={permissionDenied} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.screen,
    marginTop: Spacing.sm
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
  }
});
