import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { FONTS } from "../../../src/theme/fonts";
import { ENT, ENT_CARD_SHADOW } from "../../../src/theme/enterprise";
import type { FarmerWorkflowMeta } from "../../lib/workQueue";
import type { MobileFarmer } from "../../lib/farmersApi";
import { avatarInitials } from "../../lib/avatarColor";
import { farmerVisitCount } from "../../lib/farmerStatus";
import { buildFarmerWorkflowMeta } from "../../lib/workQueue";

function FarmerAvatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{avatarInitials(name)}</Text>
    </View>
  );
}

type Props = {
  farmer: MobileFarmer;
  workflow?: FarmerWorkflowMeta;
  onPress: () => void;
  onCall?: () => void;
  onMap: () => void;
  onVisit: () => void;
};

export function FarmerDirectoryCard({ farmer, workflow, onPress, onCall, onMap, onVisit }: Props) {
  const { t } = useI18n();
  const meta = workflow ?? buildFarmerWorkflowMeta(farmer);
  const village = farmer.village_name || farmer.village;
  const phone = farmer.phone?.trim() || "";
  const neverVisited = farmerVisitCount(farmer) === 0;
  const canCall = Boolean(phone);
  const displayName = farmer.name || t("visitFlow.farmer");

  function handleCall() {
    if (onCall) {
      onCall();
      return;
    }
    if (canCall) {
      void Linking.openURL(`tel:${phone}`);
    }
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.98 }]}
    >
      <View style={styles.topRow}>
        <FarmerAvatar name={displayName} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {village ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={10} color={ENT.textSecondary} />
              <Text style={styles.location} numberOfLines={1}>
                {village}
              </Text>
            </View>
          ) : null}
          {meta.lastVisitDateLabel ? (
            <Text style={styles.lastVisit} numberOfLines={1}>
              {t("visitFlow.lastVisit", { date: meta.lastVisitDateLabel })}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            handleCall();
          }}
          disabled={!canCall}
          style={({ pressed }) => [styles.outlineBtn, !canCall && styles.btnDisabled, pressed && canCall && { opacity: 0.88 }]}
        >
          <Ionicons name="call-outline" size={13} color={ENT.textSecondary} />
          <Text style={styles.outlineBtnText}>{t("farmers.call")}</Text>
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onMap();
          }}
          style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name="map-outline" size={13} color={ENT.textSecondary} />
          <Text style={styles.outlineBtnText}>{t("farmers.map")}</Text>
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onVisit();
          }}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
        >
          <Ionicons name="add-circle-outline" size={13} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {neverVisited ? t("farmers.firstVisit") : t("farmers.startRevisit")}
          </Text>
        </Pressable>
      </View>
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
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  avatar: {
    alignItems: "center",
    backgroundColor: ENT.primarySoft,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  avatarText: {
    color: ENT.primary,
    fontFamily: FONTS.extrabold,
    fontSize: 12,
    fontWeight: "800"
  },
  info: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  name: {
    color: ENT.text,
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: "700"
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  location: {
    color: ENT.textSecondary,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 11
  },
  lastVisit: {
    color: ENT.textMuted,
    fontFamily: FONTS.regular,
    fontSize: 10.5,
    marginTop: 2
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  outlineBtn: {
    alignItems: "center",
    backgroundColor: ENT.bg,
    borderColor: ENT.border,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    height: 32,
    justifyContent: "center"
  },
  outlineBtnText: {
    color: ENT.textSecondary,
    fontFamily: FONTS.semibold,
    fontSize: 11,
    fontWeight: "600"
  },
  btnDisabled: {
    opacity: 0.45
  },
  primaryBtn: {
    alignItems: "center",
    backgroundColor: ENT.primary,
    borderRadius: 9,
    flex: 1.8,
    flexDirection: "row",
    gap: 4,
    height: 32,
    justifyContent: "center"
  },
  primaryBtnText: {
    color: ENT.white,
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: "700"
  }
});
