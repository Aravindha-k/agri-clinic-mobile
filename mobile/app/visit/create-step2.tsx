import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getOptionLabel } from "../../../src/api/masters";
import { extractMasterPk } from "../../../src/utils/masterId";
import { useI18n } from "../../../src/i18n/I18nContext";
import {
  resolveCropChipByName,
  resolveFarmerCropChips,
  type CropMasterRow
} from "../../../src/utils/cropSelection";
import { VisitFarmerSummaryCard } from "../../components/visit/VisitFarmerSummaryCard";
import { VisitRevisitContextCard } from "../../components/visit/VisitRevisitContextCard";
import {
  CropSelectionCard,
  type CropOptionsStatus
} from "../../components/visit/step2/CropSelectionCard";
import { MasterSelectSheet, type MasterSelectSheetRef } from "../../components/visit/MasterSelectSheet";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { PrimaryButton } from "../../components/ui";
import { VisitFlowHeader } from "../../components/visit/VisitFlowHeader";
import { VisitBottomFooter } from "../../components/visit/VisitBottomFooter";
import { filterActiveProblemItems } from "../../lib/problemCatalog";
import {
  loadCropProblemItems,
  loadFarmerFieldRows,
  loadVisitFormOptions,
  refreshAuthoritativeVisitFormOptions,
  type VisitFormOptions
} from "../../lib/visitFormOptionsApi";
import { useVisitFormStore } from "../../store/visitFormStore";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import { useVisitEntranceKey } from "../../context/VisitEntranceContext";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

type Props = {
  onBack: () => void;
};

export function VisitCreateStep2({ onBack }: Props) {
  const { t } = useI18n();
  const replayKey = useVisitEntranceKey();
  const setStep = useVisitFormStore((s) => s.setStep);
  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const revisitContext = useVisitFormStore((s) => s.revisitContext);
  const cropId = useVisitFormStore((s) => s.cropId);
  const cropName = useVisitFormStore((s) => s.cropName);
  const setCrop = useVisitFormStore((s) => s.setCrop);
  const restrictProblemsToCrop = useVisitFormStore((s) => s.restrictProblemsToCrop);

  const [formOptions, setFormOptions] = useState<VisitFormOptions | null>(null);
  const [cropsReloading, setCropsReloading] = useState(false);
  const [fieldRows, setFieldRows] = useState<unknown[]>([]);
  const [cropProblemItems, setCropProblemItems] = useState<{ id: number | string }[]>([]);
  const [itemsStatus, setItemsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [itemsCropId, setItemsCropId] = useState("");

  const cropSheetRef = useRef<MasterSelectSheetRef>(null);
  const mountedRef = useRef(true);
  const latestCropId = useRef(cropId);
  latestCropId.current = cropId;

  const activeCrops = useMemo(
    () => (formOptions?.crops ?? []) as unknown as CropMasterRow[],
    [formOptions?.crops]
  );
  const cropsStatus: CropOptionsStatus =
    !formOptions || cropsReloading ? "loading" : activeCrops.length ? "ready" : "error";
  const problemsVerified = itemsStatus === "ready" && itemsCropId === cropId && !!cropId;

  const cropTamilName = useMemo(() => {
    if (!cropId) return undefined;
    const match = activeCrops.find((c) => String(c.id) === cropId);
    return match?.name_ta?.trim() || undefined;
  }, [activeCrops, cropId]);

  const fieldCrops = useMemo(() => {
    const chips = resolveFarmerCropChips(fieldRows, activeCrops);
    if (chips.length) return chips;
    const byName = resolveCropChipByName(farmer?.crop_name || farmer?.list_crop_name, activeCrops);
    return byName ? [byName] : [];
  }, [activeCrops, farmer?.crop_name, farmer?.list_crop_name, fieldRows]);

  useEffect(() => {
    mountedRef.current = true;
    void loadVisitFormOptions().then((opts) => {
      if (mountedRef.current) setFormOptions(opts);
    });
    void refreshAuthoritativeVisitFormOptions().then((fresh) => {
      if (mountedRef.current && fresh) setFormOptions(fresh);
    });
    if (farmer?.id) {
      void loadFarmerFieldRows(farmer.id).then((rows) => {
        if (mountedRef.current) setFieldRows(rows);
      });
    }
    return () => {
      mountedRef.current = false;
    };
  }, [farmer?.id]);

  // Allowed-problem list for this crop — used only to keep selections valid
  // when the crop changes (selections themselves are edited on steps 3/4).
  useEffect(() => {
    if (!cropId) {
      setCropProblemItems([]);
      setItemsCropId("");
      setItemsStatus("idle");
      return;
    }
    const requested = cropId;
    setItemsStatus("loading");
    loadCropProblemItems(requested)
      .then((items) => {
        if (!mountedRef.current || latestCropId.current !== requested) return;
        setCropProblemItems(filterActiveProblemItems(items));
        setItemsCropId(requested);
        setItemsStatus("ready");
      })
      .catch(() => {
        if (!mountedRef.current || latestCropId.current !== requested) return;
        setCropProblemItems([]);
        setItemsCropId(requested);
        setItemsStatus("error");
      });
  }, [cropId]);

  useEffect(() => {
    if (!problemsVerified) return;
    restrictProblemsToCrop(cropProblemItems.map((item) => item.id));
  }, [cropProblemItems, problemsVerified, restrictProblemsToCrop]);

  const cropSheetItems = useMemo(
    () =>
      (formOptions?.crops ?? []).map((c) => ({
        id: String(c.id),
        title: getOptionLabel(c),
        subtitle: c.name_ta || undefined
      })),
    [formOptions?.crops]
  );

  const canContinue = Boolean(cropId);
  const cropInlineHint = !cropId && cropsStatus === "ready" ? t("visitFlow.errSelectCrop") : "";

  function handleCropSelect(nextCropId: string, nextCropName: string) {
    const cropPk = extractMasterPk(nextCropId);
    if (cropPk == null) return;
    setCrop(String(cropPk), nextCropName);
  }

  function retryCrops() {
    setCropsReloading(true);
    void refreshAuthoritativeVisitFormOptions().then((fresh) => {
      if (!mountedRef.current) return;
      if (fresh) setFormOptions(fresh);
      setCropsReloading(false);
    });
    if (farmer?.id) {
      void loadFarmerFieldRows(farmer.id).then((rows) => {
        if (mountedRef.current) setFieldRows(rows);
      });
    }
  }

  return (
    <View style={styles.screen}>
      <VisitFlowHeader
        title={t("visitFlow.selectCrop")}
        subtitle={t("visitFlow.step2of6")}
        icon="leaf-outline"
        onBack={onBack}
      />

      <View style={styles.stepWrap}>
        <StepIndicator step={2} />
      </View>

      <FadeInSection replayKey={replayKey} delay={entranceStagger(0)} variant="card">
        <VisitFarmerSummaryCard farmer={farmer} newFarmer={newFarmer} />
        {revisitContext ? (
          <View style={styles.revisitContextWrap}>
            <VisitRevisitContextCard context={revisitContext} />
          </View>
        ) : null}
      </FadeInSection>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeInSection replayKey={replayKey} delay={entranceStagger(1)} variant="card">
          <CropSelectionCard
            cropId={cropId}
            cropName={cropName}
            cropTamilName={cropTamilName}
            fieldCrops={fieldCrops}
            cropsStatus={cropsStatus}
            onRetryCrops={retryCrops}
            onChooseCrop={() => cropSheetRef.current?.open()}
            onQuickCrop={handleCropSelect}
          />
          {cropInlineHint ? <Text style={styles.inlineError}>{cropInlineHint}</Text> : null}
        </FadeInSection>
        <View style={styles.footerSpacer} />
      </ScrollView>

      <VisitBottomFooter hint={!canContinue ? t("visitFlow.hintSelectCrop") : undefined}>
        <PrimaryButton
          label={t("visitFlow.continue")}
          onPress={() => {
            if (canContinue) setStep(3);
          }}
          disabled={!canContinue}
          style={styles.footerBtn}
        />
      </VisitBottomFooter>

      <MasterSelectSheet
        ref={cropSheetRef}
        title={t("visitFlow.selectCropSheet")}
        items={cropSheetItems}
        selectedId={cropId}
        loading={cropsStatus === "loading"}
        onSelect={(item) => handleCropSelect(item.id, item.title)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  stepWrap: { paddingHorizontal: Spacing.screen, paddingBottom: Spacing.xs },
  revisitContextWrap: { marginHorizontal: Spacing.screen, marginBottom: Spacing.sm },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screen, paddingBottom: Spacing.xxl },
  inlineError: { color: Colors.redText, fontSize: FontSize.sm, marginTop: Spacing.xs },
  footerSpacer: { height: 96 },
  footerBtn: { width: "100%" }
});
