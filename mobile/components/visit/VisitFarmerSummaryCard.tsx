import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { farmerVisitCount } from "../../lib/farmerStatus";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";
import type { Farmer } from "../../../src/api/farmers";
import type { NewFarmerDraft } from "../../store/visitFormStore";
import { farmerDisplayName, useVisitFormStore } from "../../store/visitFormStore";

type Props = {
  farmer: Farmer | null;
  newFarmer: NewFarmerDraft | null;
};

export function VisitFarmerSummaryCard({ farmer, newFarmer }: Props) {
  const { t } = useI18n();
  const { villages } = useMasterData();
  const visitKind = useVisitFormStore((s) => s.visitKind);
  const pendingProblemMasterId = useVisitFormStore((s) => s.pendingProblemMasterId);

  const name = farmerDisplayName(farmer, newFarmer);
  const phone = (farmer?.phone || newFarmer?.phone || "").trim();

  const villageName = farmer
    ? String(farmer.village_name || farmer.village || "").trim()
    : villages.find((v) => String(v.id) === newFarmer?.village_id)?.name?.trim() || "";

  const visitTypeLabel =
    visitKind === "revisit" ||
    (farmer && (farmerVisitCount(farmer) > 0 || Boolean(pendingProblemMasterId)))
      ? t("visitFlow.revisit")
      : t("visitFlow.firstVisit");

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t("visitFlow.farmer")}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {villageName ? (
        <Text style={styles.meta} numberOfLines={1}>
          {t("visitFlow.villageLabel")}: {villageName}
        </Text>
      ) : null}
      {phone ? (
        <Text style={styles.meta} numberOfLines={1}>
          {t("visitFlow.phoneLabel")}: {phone}
        </Text>
      ) : null}
      <View style={styles.visitTypeRow}>
        <Text style={styles.visitTypeLabel}>{t("visitFlow.visitType")}</Text>
        <Text style={styles.visitTypeValue}>{visitTypeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    gap: 2,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm
  },
  heading: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  name: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  meta: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  visitTypeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4
  },
  visitTypeLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  visitTypeValue: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  }
});
