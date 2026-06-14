import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { FONTS } from "../../../src/theme/fonts";
import type { FarmerWorkflowMeta } from "../../lib/workQueue";
import type { MobileFarmer } from "../../lib/farmersApi";
import { avatarInitials, getAvatarColors } from "../../lib/avatarColor";
import { farmerVisitCount } from "../../lib/farmerStatus";
import { buildFarmerWorkflowMeta } from "../../lib/workQueue";

const DS = {
  surface: "#ffffff",
  border: "#f1f5f9",
  textPrimary: "#0f172a",
  textMuted: "#94a3b8",
  textAction: "#475569",
  accent: "#16a34a",
  inputBorder: "#e2e8f0"
} as const;

function FarmerAvatar({ name }: { name: string }) {
  const { bg, text } = getAvatarColors(name);
  return (
    <View style={[styles.avatar, { backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { color: text }]}>{avatarInitials(name)}</Text>
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
              <Ionicons name="location-outline" size={10} color={DS.textMuted} />
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
          <Ionicons name="call-outline" size={13} color={DS.textAction} />
          <Text style={styles.outlineBtnText}>{t("farmers.call")}</Text>
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onMap();
          }}
          style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name="map-outline" size={13} color={DS.textAction} />
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
    backgroundColor: DS.surface,
    borderColor: DS.border,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 10,
    marginHorizontal: 16,
    padding: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  avatar: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  avatarText: {
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
    color: DS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: "700"
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  location: {
    color: DS.textMuted,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 10
  },
  lastVisit: {
    color: DS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: 10,
    marginTop: 2
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  outlineBtn: {
    alignItems: "center",
    backgroundColor: DS.surface,
    borderColor: DS.inputBorder,
    borderRadius: 9,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    height: 32,
    justifyContent: "center"
  },
  outlineBtnText: {
    color: DS.textAction,
    fontFamily: FONTS.semibold,
    fontSize: 10,
    fontWeight: "600"
  },
  btnDisabled: {
    opacity: 0.45
  },
  primaryBtn: {
    alignItems: "center",
    backgroundColor: DS.accent,
    borderRadius: 9,
    flex: 1.8,
    flexDirection: "row",
    gap: 4,
    height: 32,
    justifyContent: "center"
  },
  primaryBtnText: {
    color: "#fff",
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: "700"
  }
});
