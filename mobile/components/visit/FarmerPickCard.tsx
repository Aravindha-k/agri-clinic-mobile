import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import type { MobileFarmer } from "../../lib/farmersApi";
import { buildFarmerWorkflowMeta } from "../../lib/workQueue";
import { Avatar } from "../ui/Avatar";
import { StatusChip } from "../ui/StatusChip";
import { Colors, FontSize, FontWeight, Radius } from "../../lib/theme";

type Props = {
  farmer: MobileFarmer;
  onPress: () => void;
};

export function FarmerPickCard({ farmer, onPress }: Props) {
  const { t } = useI18n();
  const meta = buildFarmerWorkflowMeta(farmer);
  const village = farmer.village_name || farmer.village || t("visitFlow.villageNotSet");
  const crop = farmer.crop_name || farmer.list_crop_name;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
    >
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
      <Ionicons name="chevron-forward" size={18} color={Colors.text4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  name: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  village: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  metaLine: {
    color: Colors.text4,
    fontSize: FontSize.sm
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2
  }
});
