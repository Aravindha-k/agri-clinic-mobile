import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Farmer } from "../../api/farmers";
import { ProfileAvatar } from "../ProfileAvatar";
import { useTheme } from "../../theme";
import { listCardLayout, listCardStyles, listCardType } from "../../theme/listCard";
import { shadows } from "../../theme/shadows";
import { extractPhotoUrl } from "../../utils/profilePhotoUrl";

type Props = {
  farmer: Farmer;
  onPress: () => void;
  onStartVisit?: () => void;
  onViewMap?: () => void;
};

export function FarmerCard({ farmer, onPress, onStartVisit, onViewMap }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const place = [farmer.village_name || farmer.village, farmer.district_name || farmer.district].filter(Boolean).join(", ");
  const crop = farmer.crop_name || farmer.list_crop_name || "Crop not set";
  const phone = farmer.phone?.trim() || "Phone not set";
  const hasPhone = Boolean(farmer.phone?.trim());

  return (
    <View style={[listCardStyles.cardShell, { backgroundColor: c.card, borderColor: c.border }, shadows.card]}>
      <View style={[listCardStyles.accent, { backgroundColor: hasPhone ? c.primary : c.muted }]} />
      <View style={listCardStyles.cardBody}>
        <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
          <View style={listCardStyles.row}>
            <ProfileAvatar name={farmer.name} photoUrl={extractPhotoUrl(farmer)} size="sm" />
            <View style={listCardStyles.body}>
              <Text style={[listCardType.title, { color: c.text }]} numberOfLines={1}>
                {farmer.name || "Farmer"}
              </Text>
              {place ? (
                <View style={listCardStyles.metaRow}>
                  <Ionicons name="location-outline" size={listCardLayout.iconSize} color={c.muted} />
                  <Text style={[listCardType.meta, { color: c.muted, flex: 1 }]} numberOfLines={1}>
                    {place}
                  </Text>
                </View>
              ) : null}
              <View style={listCardStyles.metaRow}>
                <Ionicons name="call-outline" size={listCardLayout.iconSize} color={c.primary} />
                <Text style={[listCardType.meta, { color: c.textSecondary, flex: 1 }]} numberOfLines={1}>
                  {phone}
                </Text>
              </View>
              <View style={listCardStyles.metaRow}>
                <Ionicons name="leaf-outline" size={listCardLayout.iconSize} color={c.primary} />
                <Text style={[listCardType.meta, { color: c.textSecondary, flex: 1 }]} numberOfLines={1}>
                  {crop}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </View>
        </Pressable>

        {onStartVisit || onViewMap ? (
          <View style={listCardStyles.actionRow}>
            {onViewMap ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View farmer on map"
                onPress={onViewMap}
                style={[listCardStyles.actionBtn, { backgroundColor: c.cardMuted, borderColor: c.border }]}
              >
                <Ionicons name="map-outline" size={16} color={c.primaryDark} />
                <Text style={[listCardType.caption, { color: c.primaryDark }]}>Map</Text>
              </Pressable>
            ) : null}
            {onStartVisit ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Revisit farmer"
                onPress={onStartVisit}
                style={[listCardStyles.actionBtn, { backgroundColor: c.primarySoft, borderColor: c.primarySoft }]}
              >
                <Ionicons name="add-circle-outline" size={16} color={c.primaryDark} />
                <Text style={[listCardType.caption, { color: c.primaryDark }]}>Revisit</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.96 }
});
