import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../../src/i18n/I18nContext";
import type { FarmerCropChip } from "../../../../src/utils/cropSelection";
import { bilingualLabel } from "../../../../src/utils/bilingualName";
import { Colors, FontSize, FontWeight, Radius } from "../../../lib/theme";
import { PrimaryButton } from "../../ui";

export type CropOptionsStatus = "loading" | "ready" | "error";

type Props = {
  cropId: string;
  cropName: string;
  cropTamilName?: string;
  fieldCrops: FarmerCropChip[];
  cropsStatus: CropOptionsStatus;
  onRetryCrops: () => void;
  onChooseCrop: () => void;
  onQuickCrop: (cropId: string, cropName: string, cropTamilName?: string) => void;
};

export function CropSelectionCard({
  cropId,
  cropName,
  cropTamilName,
  fieldCrops,
  cropsStatus,
  onRetryCrops,
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
        {cropsStatus === "error" ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Ionicons name="cloud-offline-outline" size={20} color={Colors.redText} />
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>{t("visitFlow.cropsLoadFailed")}</Text>
              <Text style={styles.errorSub}>{t("visitFlow.cropsLoadFailedSub")}</Text>
            </View>
          </View>
        ) : null}
        {cropsStatus === "error" ? (
          <PrimaryButton
            label={t("visitFlow.retry")}
            onPress={onRetryCrops}
            variant="outline"
            icon={<Ionicons name="refresh" size={18} color={Colors.text1} />}
            style={styles.fullWidth}
          />
        ) : (
          <PrimaryButton
            label={cropsStatus === "loading" ? t("visitFlow.loadingCrops") : t("visitFlow.chooseCrop")}
            onPress={onChooseCrop}
            loading={cropsStatus === "loading"}
            icon={<Ionicons name="leaf-outline" size={18} color={Colors.surface} />}
            style={styles.fullWidth}
          />
        )}
        {cropsStatus === "ready" && fieldCrops.length > 0 ? (
          <View style={styles.quickBlock}>
            <Text style={styles.quickLabel}>{t("visitFlow.farmersCrops")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRow}
              keyboardShouldPersistTaps="handled"
            >
              {fieldCrops.map((chip) => (
                <Pressable
                  key={chip.crop_id}
                  onPress={() => onQuickCrop(chip.crop_id, chip.crop_name, chip.crop_name_ta)}
                  accessibilityRole="button"
                  accessibilityLabel={bilingualLabel(chip.crop_name, chip.crop_name_ta)}
                  style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
                >
                  <Ionicons name="leaf" size={14} color={Colors.brand700} />
                  <Text style={styles.quickChipText} numberOfLines={2}>
                    {bilingualLabel(chip.crop_name, chip.crop_name_ta)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.selectedCard}>
      <View style={styles.selectedHead}>
        <Text style={styles.selectedLabel}>{t("visitFlow.cropSelected")}</Text>
        <Pressable
          onPress={onChooseCrop}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("visitFlow.changeCrop")}
          style={({ pressed }) => [styles.changeBtn, pressed && styles.pressed]}
        >
          <Ionicons name="swap-horizontal" size={14} color={Colors.brand700} />
          <Text style={styles.changeLink}>{t("visitFlow.changeCrop")}</Text>
        </Pressable>
      </View>
      <View style={styles.selectedBody}>
        <View style={styles.leafBadge}>
          <Ionicons name="leaf-outline" size={20} color={Colors.brand700} />
        </View>
        <View style={styles.selectedCopy}>
          <Text style={styles.cropName} numberOfLines={3}>
            {bilingualLabel(cropName, cropTamilName)}
          </Text>
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
    gap: 12,
    padding: 16
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
  fullWidth: {
    width: "100%"
  },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: Colors.redBg,
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  errorCopy: {
    flex: 1,
    gap: 2
  },
  errorTitle: {
    color: Colors.redText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  errorSub: {
    color: Colors.redText,
    fontSize: FontSize.sm
  },
  quickBlock: {
    gap: 8
  },
  quickLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  quickRow: {
    gap: 8,
    paddingRight: 4
  },
  quickChip: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand700,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    maxWidth: 240,
    minHeight: 44,
    paddingHorizontal: 14
  },
  quickChipText: {
    color: Colors.brand700,
    flexShrink: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  pressed: {
    opacity: 0.85
  },
  selectedCard: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: 10,
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
  changeBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.brand100,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12
  },
  changeLink: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  selectedBody: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  leafBadge: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  selectedCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
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
