import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import type { MobileFarmer } from "../../lib/farmersApi";
import { buildFarmerWorkflowMeta } from "../../lib/workQueue";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";
import { Avatar, PressableCard, StatusChip } from "../ui";

type Props = {
  farmer: MobileFarmer;
  onPress: () => void;
};

export const FarmerPickCard = memo(function FarmerPickCard({ farmer, onPress }: Props) {
  const { t } = useI18n();
  const meta = buildFarmerWorkflowMeta(farmer);
  const village = farmer.village_name || farmer.village || t("visitFlow.villageNotSet");
  const crop = farmer.crop_name || farmer.list_crop_name;

  return (
    <PressableCard onPress={onPress} accessibilityRole="button" style={styles.wrap}>
      <FlatCard style={styles.card}>
        <Avatar name={farmer.name || t("visitFlow.farmer")} size="sm" />
        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>
            {farmer.name || t("visitFlow.farmer")}
          </Text>
          <Text style={styles.village} numberOfLines={1}>
            {String(village)}
          </Text>
          {meta.lastVisitDateLabel ? (
            <Text style={styles.metaLine} numberOfLines={1}>
              {t("visitFlow.lastVisit", { date: meta.lastVisitDateLabel })}
            </Text>
          ) : null}
          {crop ? (
            <View style={styles.chipRow}>
              <StatusChip label={crop} variant="gray" />
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.text4} />
      </FlatCard>
    </PressableCard>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.sm
  },
  card: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.lg
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  name: {
    color: Colors.text1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  },
  village: {
    color: Colors.text3,
    fontSize: FontSize.caption
  },
  metaLine: {
    color: Colors.text4,
    fontSize: FontSize.caption
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs
  }
});
