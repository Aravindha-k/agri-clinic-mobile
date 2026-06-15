import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { Visit } from "../../../src/api/visits";
import { FONTS } from "../../../src/theme/fonts";
import { ENT, ENT_CARD_SHADOW } from "../../../src/theme/enterprise";
import type { PendingVisitRecord } from "../../lib/pendingVisitsQueue";
import { avatarInitials, getAvatarColors } from "../../lib/avatarColor";
import { resolveVisitFarmer } from "../../../src/utils/visitFarmer";
import { visitDisplayIso } from "../../../src/utils/format";

function VisitAvatar({ name }: { name: string }) {
  const { bg, text } = getAvatarColors(name);
  return (
    <View style={[styles.avatar, { backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { color: text }]}>{avatarInitials(name)}</Text>
    </View>
  );
}

type Props = {
  visit?: Visit;
  pending?: PendingVisitRecord;
  onPress?: () => void;
};

function formatCardTime(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function hasGps(lat?: string | number | null, lng?: string | number | null) {
  return lat != null && lng != null && String(lat) !== "" && String(lng) !== "";
}

function problemCategoryLabel(visit: Visit) {
  const code = visit.field_visit?.problem_category?.code;
  if (code) return code;
  const name = visit.field_visit?.problem_category?.name;
  if (name) return name;
  return visit.problem_seen?.trim() || "Problem";
}

export function VisitListCard({ visit, pending, onPress }: Props) {
  const isPending = Boolean(pending);
  const values = pending?.values;
  const resolved = visit ? resolveVisitFarmer(visit) : null;
  const farmerName = isPending ? values?.farmer_name?.trim() || "Farmer" : resolved!.name;
  const phone = isPending ? values?.farmer_phone?.trim() || "" : resolved!.phone;
  const cropName = isPending ? values?.crop_name?.trim() || "Crop" : resolved!.cropName;
  const village = isPending
    ? "Saved offline"
    : resolved!.village !== "—"
      ? resolved!.village
      : "Village not set";
  const problemLabel = isPending
    ? values?.problem_seen?.trim() || "Pending"
    : problemCategoryLabel(visit!);
  const timeIso = isPending ? pending!.createdAt : visitDisplayIso(visit!);
  const gpsOk = isPending
    ? hasGps(values?.latitude, values?.longitude)
    : hasGps(visit!.latitude, visit!.longitude);
  const canCall = Boolean(phone && phone !== "—");

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, isPending && styles.cardPending, pressed && onPress && { opacity: 0.98 }]}
    >
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <VisitAvatar name={farmerName} />
          <View style={styles.nameCol}>
            <Text style={styles.farmerName} numberOfLines={1}>
              {farmerName}
            </Text>
            <Text style={styles.time}>{formatCardTime(timeIso)}</Text>
          </View>
        </View>
        {gpsOk ? (
          <View style={styles.gpsBadge}>
            <Ionicons name="location" size={10} color={ENT.primary} />
            <Text style={styles.gpsText}>GPS ✓</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.tagsRow}>
        <View style={styles.cropTag}>
          <Text style={styles.cropTagText} numberOfLines={1}>
            {cropName !== "—" ? cropName : "Crop"}
          </Text>
        </View>
        <View style={styles.pestTag}>
          <Text style={styles.pestTagText} numberOfLines={1}>
            {problemLabel}
          </Text>
        </View>
        {isPending ? (
          <View style={styles.pendingTag}>
            <Text style={styles.pendingTagText}>Pending sync</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={11} color={ENT.textSecondary} />
        <Text style={styles.locationText} numberOfLines={1}>
          {village !== "—" ? village : "Village not set"}
        </Text>
      </View>

      {canCall ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            void Linking.openURL(`tel:${phone}`);
          }}
          style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name="call-outline" size={14} color={ENT.textSecondary} />
          <Text style={styles.callBtnText}>Call farmer</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ENT.card,
    borderColor: ENT.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    marginHorizontal: 16,
    padding: 14,
    ...ENT_CARD_SHADOW
  },
  cardPending: {
    borderLeftColor: ENT.warning,
    borderLeftWidth: 3
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  topLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0
  },
  avatar: {
    alignItems: "center",
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  avatarText: {
    fontFamily: FONTS.extrabold,
    fontSize: 11,
    fontWeight: "800"
  },
  nameCol: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  farmerName: {
    color: ENT.text,
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: "700"
  },
  time: {
    color: ENT.textSecondary,
    fontFamily: FONTS.medium,
    fontSize: 10,
    fontWeight: "500"
  },
  gpsBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3
  },
  gpsText: {
    color: ENT.primary,
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    fontWeight: "700"
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10
  },
  cropTag: {
    backgroundColor: ENT.bg,
    borderColor: ENT.border,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  cropTagText: {
    color: ENT.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: 10,
    fontWeight: "600"
  },
  pestTag: {
    backgroundColor: ENT.dangerSoft,
    borderColor: "#FECACA",
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  pestTagText: {
    color: ENT.danger,
    fontFamily: FONTS.semibold,
    fontSize: 10,
    fontWeight: "600"
  },
  pendingTag: {
    backgroundColor: ENT.warningSoft,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  pendingTagText: {
    color: ENT.warning,
    fontFamily: FONTS.semibold,
    fontSize: 9,
    fontWeight: "600"
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 8
  },
  locationText: {
    color: ENT.textSecondary,
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 10.5,
    fontWeight: "500"
  },
  callBtn: {
    alignItems: "center",
    backgroundColor: ENT.bg,
    borderColor: ENT.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    height: 36,
    justifyContent: "center",
    marginTop: 10,
    width: "100%"
  },
  callBtnText: {
    color: ENT.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: 11,
    fontWeight: "600"
  }
});
