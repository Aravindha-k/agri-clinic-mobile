import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { Visit } from "../../../src/api/visits";
import { resolveVisitFarmer } from "../../../src/utils/visitFarmer";
import { visitDisplayIso } from "../../../src/utils/format";
import type { PendingVisitRecord } from "../../lib/pendingVisitsQueue";
import { avatarInitials, getAvatarColors } from "../../lib/avatarColor";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";
import { PressableCard } from "../ui/PressableCard";
import { StatusChip } from "../ui/StatusChip";

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

export const VisitListCard = memo(function VisitListCard({ visit, pending, onPress }: Props) {
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

  const card = (
    <FlatCard style={isPending ? [styles.card, styles.cardPending] : styles.card}>
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
        {gpsOk ? <StatusChip label="GPS" variant="success" icon="location" /> : null}
      </View>

      <View style={styles.tagsRow}>
        <StatusChip label={cropName !== "—" ? cropName : "Crop"} variant="gray" />
        <StatusChip label={problemLabel} variant="error" />
        {isPending ? <StatusChip label="Pending sync" variant="pending" /> : null}
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color={Colors.text3} />
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
          style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="call-outline" size={16} color={Colors.text2} />
          <Text style={styles.callBtnText}>Call farmer</Text>
        </Pressable>
      ) : null}
    </FlatCard>
  );

  if (!onPress) {
    return <View style={styles.wrap}>{card}</View>;
  }

  return (
    <PressableCard onPress={onPress} style={styles.wrap}>
      {card}
    </PressableCard>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg
  },
  card: {
    gap: Spacing.md,
    padding: Spacing.lg
  },
  cardPending: {
    borderLeftColor: Colors.amber,
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
    gap: Spacing.md,
    minWidth: 0
  },
  avatar: {
    alignItems: "center",
    borderRadius: Radius.inner,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  avatarText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold
  },
  nameCol: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  farmerName: {
    color: Colors.text1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  },
  time: {
    color: Colors.text3,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.xs
  },
  locationText: {
    color: Colors.text3,
    flex: 1,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  },
  callBtn: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    height: 44,
    justifyContent: "center",
    width: "100%"
  },
  callBtnText: {
    color: Colors.text2,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  }
});
