import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Farmer } from "../../api/farmers";
import { ProfileAvatar } from "../ProfileAvatar";
import { useTheme } from "../../theme";
import { stitch } from "../../theme/stitchTokens";
import { shadows } from "../../theme/shadows";
import { extractPhotoUrl } from "../../utils/profilePhotoUrl";
import { formatFarmerLastVisit } from "../../utils/farmerDirectory";

type Props = {
  farmer: Farmer;
  onPress: () => void;
  onRevisit?: () => void;
  onViewMap?: () => void;
  lastVisitLabel?: string;
};

export function FarmerCard({ farmer, onPress, onRevisit, onViewMap, lastVisitLabel }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const place = [farmer.village_name || farmer.village, farmer.district_name || farmer.district].filter(Boolean).join(", ");
  const crop = farmer.crop_name || farmer.list_crop_name || "Crop not set";
  const phone = farmer.phone?.trim() || "—";
  const lastVisit = lastVisitLabel ?? formatFarmerLastVisit(farmer);
  const canCall = Boolean(farmer.phone?.trim());

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.borderSubtle }, shadows.card]}>
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <ProfileAvatar name={farmer.name} photoUrl={extractPhotoUrl(farmer)} size="md" />
        <View style={styles.body}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {farmer.name || "Farmer"}
          </Text>
          {place ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={c.muted} />
              <Text style={[styles.meta, { color: c.textSecondary }]} numberOfLines={1}>
                {place}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons name="call-outline" size={14} color={c.primary} />
            <Text style={[styles.meta, { color: c.textSecondary }]} numberOfLines={1}>
              {phone}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="leaf-outline" size={14} color={c.primary} />
            <Text style={[styles.meta, { color: c.textSecondary }]} numberOfLines={1}>
              {crop}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.muted} />
      </Pressable>

      <View style={[styles.footer, { borderTopColor: c.borderSubtle }]}>
        <View style={styles.lastVisit}>
          <Text style={[styles.lastLabel, { color: c.muted }]}>LAST VISIT</Text>
          <Text style={[styles.lastValue, { color: c.text }]} numberOfLines={1}>
            {lastVisit}
          </Text>
        </View>
        <View style={styles.actions}>
          {canCall ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => Linking.openURL(`tel:${farmer.phone!.trim()}`)}
              style={[styles.viewBtn, { backgroundColor: stitch.cardTint, borderColor: c.border }]}
            >
              <Ionicons name="call" size={16} color={c.primaryDark} />
              <Text style={[styles.viewBtnText, { color: c.primaryDark }]}>Call</Text>
            </Pressable>
          ) : null}
          {onViewMap ? (
            <Pressable
              accessibilityRole="button"
              onPress={onViewMap}
              style={[styles.viewBtn, { backgroundColor: stitch.cardTint, borderColor: c.border }]}
            >
              <Text style={[styles.viewBtnText, { color: c.primaryDark }]}>Map</Text>
            </Pressable>
          ) : null}
          {onRevisit ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRevisit}
              style={[styles.revisitBtn, { backgroundColor: c.primary }]}
            >
              <Text style={styles.revisitText}>Revisit</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: stitch.radiusCard,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  },
  main: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  pressed: { opacity: 0.96 },
  body: { flex: 1, gap: 4, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "800" },
  metaRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  meta: { flex: 1, fontSize: 13, lineHeight: 18 },
  footer: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  lastVisit: { flex: 1, minWidth: 0 },
  lastLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  lastValue: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  actions: { alignItems: "center", flexDirection: "row", gap: 8 },
  viewBtn: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  viewBtnText: { fontSize: 13, fontWeight: "800" },
  revisitBtn: {
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  revisitText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }
});
