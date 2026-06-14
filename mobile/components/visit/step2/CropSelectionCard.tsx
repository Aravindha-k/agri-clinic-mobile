import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../../src/i18n/I18nContext";
import type { FarmerFieldCropChip } from "../../../lib/visitFormOptionsApi";
import { Colors, FontSize, FontWeight, Radius } from "../../../lib/theme";
import { PrimaryButton } from "../../ui";

type Props = {
  cropId: string;
  cropName: string;
  cropTamilName?: string;
  fieldCrops: FarmerFieldCropChip[];
  onChooseCrop: () => void;
  onQuickCrop: (cropId: string, cropName: string) => void;
};

export function CropSelectionCard({
  cropId,
  cropName,
  cropTamilName,
  fieldCrops,
  onChooseCrop,
  onQuickCrop
}: Props) {
  const { t } = useI18n();

  if (!cropId) {
    return (
      <View style={styles.promptCard}>
        <View style={styles.promptCopy}>
          <Text style={styles.promptTitle}>{t("visitFlow.selectCrop")}</Text>
          <Text style={styles.promptSub}>{t("visitFlow.chooseCropSub")}</Text>
        </View>
        <PrimaryButton label={t("visitFlow.chooseCrop")} onPress={onChooseCrop} style={styles.chooseBtn} />
        {fieldCrops.length > 0 ? (
          <>
            <Text style={styles.quickLabel}>{t("visitFlow.farmersCrops")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
              {fieldCrops.map((chip) => (
                <Pressable
                  key={chip.id}
                  onPress={() => onQuickCrop(chip.crop_id || chip.id, chip.crop_name)}
                  style={styles.quickChip}
                >
                  <Text style={styles.quickChipText} numberOfLines={1}>
                    {chip.crop_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.selectedCard}>
      <View style={styles.selectedHead}>
        <Text style={styles.selectedLabel}>{t("visitFlow.cropSelected")}</Text>
        <Pressable onPress={onChooseCrop} hitSlop={8}>
          <Text style={styles.changeLink}>{t("visitFlow.changeCrop")}</Text>
        </Pressable>
      </View>
      <View style={styles.selectedBody}>
        <Text style={styles.cropEmoji}>🌾</Text>
        <View style={styles.selectedCopy}>
          <Text style={styles.cropName}>{cropName}</Text>
          {cropTamilName ? <Text style={styles.cropTamil}>{cropTamilName}</Text> : null}
        </View>
        <Ionicons name="checkmark-circle" size={22} color={Colors.green} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  promptCopy: {
    gap: 4
  },
  promptTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  promptSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  chooseBtn: {
    width: "100%"
  },
  quickLabel: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  quickRow: {
    gap: 8
  },
  quickChip: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand700,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  quickChipText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  selectedCard: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: 8,
    padding: 14
  },
  selectedHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  selectedLabel: {
    color: Colors.greenText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  changeLink: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  selectedBody: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  cropEmoji: {
    fontSize: 22
  },
  selectedCopy: {
    flex: 1,
    gap: 2
  },
  cropName: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  cropTamil: {
    color: Colors.text3,
    fontSize: FontSize.sm
  }
});
