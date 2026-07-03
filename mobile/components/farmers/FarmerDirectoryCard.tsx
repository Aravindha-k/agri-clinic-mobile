import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Colors, Enterprise, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import type { FarmerWorkflowMeta, VisitPriorityLabel } from "../../lib/workQueue";
import type { MobileFarmer } from "../../lib/farmersApi";
import { farmerVisitCount } from "../../lib/farmerStatus";
import { buildFarmerWorkflowMeta } from "../../lib/workQueue";
import { FlatCard } from "../layout/FlatCard";
import { PressableCard } from "../ui/PressableCard";

function priorityStyles(label: VisitPriorityLabel) {
  switch (label) {
    case "Overdue":
      return { bg: Colors.redBg, text: Colors.redText, border: Colors.red };
    case "Today":
      return { bg: Colors.amberBg, text: Colors.amberText, border: Colors.amber };
    default:
      return { bg: Colors.blueBg, text: Colors.blueText, border: Colors.blue };
  }
}

function priorityLabelKey(label: VisitPriorityLabel) {
  switch (label) {
    case "Overdue":
      return "work.priorityUrgent";
    case "Today":
      return "work.priorityToday";
    default:
      return "work.priorityRoutine";
  }
}

function farmerCropLabel(farmer: MobileFarmer) {
  return farmer.list_crop_name?.trim() || farmer.crop_name?.trim() || "";
}

type Props = {
  farmer: MobileFarmer;
  workflow?: FarmerWorkflowMeta;
  onPress: () => void;
  onCall?: () => void;
  onMap: () => void;
  onVisit: () => void;
};

export const FarmerDirectoryCard = memo(function FarmerDirectoryCard({
  farmer,
  workflow,
  onPress,
  onCall,
  onMap,
  onVisit
}: Props) {
  const { t } = useI18n();
  const meta = workflow ?? buildFarmerWorkflowMeta(farmer);
  const village = farmer.village_name || farmer.village;
  const crop = farmerCropLabel(farmer);
  const phone = farmer.phone?.trim() || "";
  const neverVisited = farmerVisitCount(farmer) === 0;
  const canCall = Boolean(phone);
  const displayName = farmer.name || t("visitFlow.farmer");
  const priority = priorityStyles(meta.priorityLabel);
  const lastVisitLabel = meta.lastVisitDateLabel || t("work.neverVisited");

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
    <PressableCard onPress={onPress} accessibilityRole="button" style={styles.wrap}>
      <FlatCard variant="list" style={styles.card}>
        <View style={styles.topBlock}>
          <View style={styles.nameRow}>
            <View style={styles.nameDot} />
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: priority.bg, borderColor: priority.border }]}>
              <Text style={[styles.priorityText, { color: priority.text }]}>
                {t(priorityLabelKey(meta.priorityLabel))}
              </Text>
            </View>
          </View>

          {village ? (
            <Text style={styles.village} numberOfLines={1}>
              {village}
            </Text>
          ) : null}

          {crop ? (
            <Text style={styles.crop} numberOfLines={1}>
              {crop}
            </Text>
          ) : null}

          <Text style={styles.lastVisit} numberOfLines={1}>
            {t("work.lastVisitLabel", { date: lastVisitLabel })}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.buttonRow}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              handleCall();
            }}
            disabled={!canCall}
            style={({ pressed }) => [
              styles.outlineBtn,
              !canCall && styles.btnDisabled,
              pressed && canCall && { opacity: 0.88 }
            ]}
          >
            <Ionicons name="call-outline" size={12} color={Colors.text3} />
            <Text style={styles.outlineBtnText}>{t("farmers.call")}</Text>
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onMap();
            }}
            style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="map-outline" size={12} color={Colors.text3} />
            <Text style={styles.outlineBtnText}>{t("farmers.map")}</Text>
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onVisit();
            }}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
          >
            <Ionicons name="add-circle-outline" size={12} color={Colors.onPrimary} />
            <Text style={styles.primaryBtnText}>
              {neverVisited ? t("farmers.firstVisit") : t("work.startVisit")}
            </Text>
          </Pressable>
        </View>
      </FlatCard>
    </PressableCard>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
    marginHorizontal: Spacing.lg
  },
  card: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg
  },
  topBlock: {
    gap: 6,
    minWidth: 0
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  nameDot: {
    backgroundColor: Colors.brand700,
    borderRadius: 4,
    height: 8,
    width: 8
  },
  name: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  priorityBadge: {
    borderRadius: Radius.chip,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1
  },
  priorityText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold
  },
  village: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  crop: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  lastVisit: {
    color: Colors.text4,
    fontSize: FontSize.xs,
    marginTop: 4
  },
  divider: {
    backgroundColor: Colors.border,
    height: StyleSheet.hairlineWidth
  },
  buttonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: 2
  },
  outlineBtn: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Enterprise.radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    height: 40,
    justifyContent: "center",
    minHeight: 40
  },
  outlineBtnText: {
    color: Colors.text2,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold
  },
  btnDisabled: {
    opacity: 0.45
  },
  primaryBtn: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: Enterprise.radius.button,
    flex: 1.5,
    flexDirection: "row",
    gap: 4,
    height: 44,
    justifyContent: "center",
    minHeight: 44
  },
  primaryBtnText: {
    color: Colors.onPrimary,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  }
});
