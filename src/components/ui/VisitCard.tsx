import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Visit } from "../../api/visits";
import { useTheme } from "../../theme";
import { listCardLayout, listCardStyles, listCardType } from "../../theme/listCard";
import { shadows } from "../../theme/shadows";
import { getVisitDisplayDateTime } from "../../utils/format";
import { formatVisitCropLine, formatVisitPlaceLine } from "../../utils/visitStatus";
import { resolveVisitFarmer } from "../../utils/visitFarmer";

type Props = {
  visit: Visit;
  onPress: () => void;
  compact?: boolean;
};

export function VisitCard({ visit, onPress, compact = false }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const farmer = resolveVisitFarmer(visit);
  const hasGps = Boolean(visit.latitude && visit.longitude);
  const when = getVisitDisplayDateTime(visit);
  const place = formatVisitPlaceLine(visit, "Village not set");
  const crop =
    farmer.cropName !== "Not provided" ? farmer.cropName : formatVisitCropLine(visit, "Crop not set");
  const initial = (farmer.name !== "—" ? farmer.name : "F")[0]?.toUpperCase() ?? "F";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={[listCardStyles.cardShell, { backgroundColor: c.card, borderColor: c.borderSubtle }, shadows.card]}>
        <View style={listCardStyles.cardBody}>
          <View style={listCardStyles.row}>
            <View style={[listCardStyles.avatar, { backgroundColor: c.primarySoft }]}>
              <Text style={[listCardStyles.avatarText, { color: c.primaryDark }]}>{initial}</Text>
            </View>
            <View style={listCardStyles.body}>
              <Text style={[listCardType.title, { color: c.text }]} numberOfLines={1}>
                {farmer.name !== "—" ? farmer.name : "Farmer"}
              </Text>
              <Text style={[listCardType.caption, { color: c.muted }, listCardStyles.dateLine]} numberOfLines={1}>
                {when}
              </Text>
              <View style={listCardStyles.metaRow}>
                <Ionicons name="location-outline" size={listCardLayout.iconSize} color={c.muted} />
                <Text style={[listCardType.meta, { color: c.textSecondary, flex: 1 }]} numberOfLines={1}>
                  {place}
                </Text>
              </View>
              {!compact ? (
                <>
                  <View style={listCardStyles.metaRow}>
                    <Ionicons name="leaf-outline" size={listCardLayout.iconSize} color={c.primary} />
                    <Text style={[listCardType.meta, { color: c.textSecondary, flex: 1 }]} numberOfLines={1}>
                      {crop}
                    </Text>
                  </View>
                  <View style={listCardStyles.metaRow}>
                    <Ionicons
                      name={hasGps ? "navigate" : "navigate-outline"}
                      size={listCardLayout.iconSize}
                      color={hasGps ? c.primary : c.muted}
                    />
                    <Text
                      style={[listCardType.meta, { color: hasGps ? c.primary : c.muted, flex: 1 }]}
                      numberOfLines={1}
                    >
                      {hasGps ? "GPS captured" : "No GPS"}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={listCardStyles.metaRow}>
                  <Ionicons name="leaf-outline" size={listCardLayout.iconSize} color={c.primary} />
                  <Text style={[listCardType.meta, { color: c.textSecondary, flex: 1 }]} numberOfLines={1}>
                    {crop}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.muted} style={styles.chevron} />
          </View>

          {!compact && farmer.phone !== "—" ? (
            <View style={[listCardStyles.footerRow, { borderTopColor: c.borderSubtle }]}>
              <Pressable
                onPress={() => Linking.openURL(`tel:${farmer.phone}`)}
                style={[listCardStyles.actionBtn, { backgroundColor: c.primary, borderColor: c.primary }]}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={[listCardType.caption, { color: "#FFFFFF" }]}>Call farmer</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 0 },
  pressed: { opacity: 0.96 },
  chevron: { marginTop: 4 }
});
