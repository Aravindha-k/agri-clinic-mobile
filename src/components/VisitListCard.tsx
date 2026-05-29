import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Visit } from "../api/visits";
import { AppCard } from "./AppCard";
import { colors } from "../theme/colors";
import { formatDisplayDateTime } from "../utils/format";
import { formatVisitCropLine, formatVisitPlaceLine } from "../utils/visitStatus";
import { resolveVisitFarmer } from "../utils/visitFarmer";

type Props = {
  visit: Visit;
  onPress: () => void;
};

function VisitListCardInner({ visit, onPress }: Props) {
  const farmer = resolveVisitFarmer(visit);
  const hasGps = Boolean(visit.latitude && visit.longitude);
  const villageLine = formatVisitPlaceLine(visit, "Village not set");

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
      <AppCard elevated style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={1}>
            {farmer.name !== "—" ? farmer.name : "Farmer"}
          </Text>
          <Text style={styles.when}>{formatDisplayDateTime(visit.created_at)}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {villageLine}
        </Text>
        <Text style={styles.crop} numberOfLines={1}>
          {farmer.cropName !== "Not provided" ? farmer.cropName : formatVisitCropLine(visit, "Crop not set")}
        </Text>
        <View style={styles.footer}>
          <View style={styles.gpsPill}>
            <Ionicons name={hasGps ? "location" : "location-outline"} size={16} color={hasGps ? colors.success : colors.muted} />
            <Text style={styles.gpsText}>{hasGps ? "Location captured" : "No location"}</Text>
          </View>
          {farmer.phone !== "—" ? (
            <Pressable
              accessibilityRole="button"
              onPress={(event) => {
                event.stopPropagation();
                Linking.openURL(`tel:${farmer.phone}`);
              }}
              style={styles.call}
            >
              <Ionicons name="call-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.callText}>Call</Text>
            </Pressable>
          ) : null}
        </View>
      </AppCard>
    </Pressable>
  );
}

export const VisitListCard = memo(VisitListCardInner);

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }]
  },
  card: {
    marginBottom: 0
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8
  },
  crop: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10
  },
  when: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 12
  },
  gpsPill: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  gpsText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  call: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginLeft: "auto"
  },
  callText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  }
});
