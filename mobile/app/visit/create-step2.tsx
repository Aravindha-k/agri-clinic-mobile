import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getOptionLabel } from "../../../src/api/masters";
import type { ProblemItem } from "../../../src/api/problems";
import { extractMasterPk } from "../../../src/utils/masterId";
import { useI18n } from "../../../src/i18n/I18nContext";
import {
  resolveCropChipByName,
  resolveFarmerCropChips,
  type CropMasterRow
} from "../../../src/utils/cropSelection";
import { displayProblemLabel } from "../../../src/utils/visitProblems";
import { VisitFarmerSummaryCard } from "../../components/visit/VisitFarmerSummaryCard";
import { VisitRevisitContextCard } from "../../components/visit/VisitRevisitContextCard";
import {
  CropSelectionCard,
  type CropOptionsStatus
} from "../../components/visit/step2/CropSelectionCard";
import { MasterSelectSheet, type MasterSelectSheetRef } from "../../components/visit/MasterSelectSheet";
import {
  OtherProblemSection,
  type OtherProblemSectionRef
} from "../../components/visit/step2/OtherProblemSection";
import { ProblemCategoryChips } from "../../components/visit/step2/ProblemCategoryChips";
import { ProblemSelectCard } from "../../components/visit/step2/ProblemSelectCard";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { PrimaryButton, SearchBar } from "../../components/ui";
import { VisitFlowHeader } from "../../components/visit/VisitFlowHeader";
import {
  VisitBottomFooter,
  VISIT_FOOTER_SCROLL_SPACE
} from "../../components/visit/VisitBottomFooter";
import {
  countItemsForCategory,
  cropHasMappedProblems,
  filterActiveProblemItems,
  filterStep2Problems,
  findProblemItemById,
  getVisibleCategoryCells,
  groupProblemsByCategory,
  isOtherCategory,
  pickSuggestedProblems
} from "../../lib/problemCatalog";
import { scrollToRegisteredSection, sectionLayoutHandler } from "../../lib/smoothScroll";
import {
  loadCropProblemItems,
  loadFarmerFieldRows,
  loadVisitFormOptions,
  refreshAuthoritativeVisitFormOptions,
  type VisitFormOptions
} from "../../lib/visitFormOptionsApi";
import { idsFromRecords } from "../../../src/utils/staleMasterFks";
import { useVisitFormStore } from "../../store/visitFormStore";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import { useVisitEntranceKey } from "../../context/VisitEntranceContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type CropItemsStatus = "idle" | "loading" | "ready" | "error";

type Props = {
  onBack: () => void;
};

export function VisitCreateStep2({ onBack }: Props) {
  const { t, language } = useI18n();
  const replayKey = useVisitEntranceKey();
  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const cropId = useVisitFormStore((s) => s.cropId);
  const cropName = useVisitFormStore((s) => s.cropName);
  const problemCategoryCode = useVisitFormStore((s) => s.problemCategoryCode);
  const selectedProblem = useVisitFormStore((s) => s.selectedProblem);
  const selectedProblems = useVisitFormStore((s) => s.selectedProblems);
  const problemsRemovedNotice = useVisitFormStore((s) => s.problemsRemovedNotice);
  const needsProblemReview = useVisitFormStore((s) => s.needsProblemReview);
  const pendingProblemMasterId = useVisitFormStore((s) => s.pendingProblemMasterId);
  const otherProblemDescription = useVisitFormStore((s) => s.otherProblemDescription);
  const revisitContext = useVisitFormStore((s) => s.revisitContext);
  const setStep = useVisitFormStore((s) => s.setStep);
  const setCrop = useVisitFormStore((s) => s.setCrop);
  const selectProblemItem = useVisitFormStore((s) => s.selectProblemItem);
  const toggleProblemItem = useVisitFormStore((s) => s.toggleProblemItem);
  const syncProblemCategoryFromMasters = useVisitFormStore((s) => s.syncProblemCategoryFromMasters);
  const selectManualOther = useVisitFormStore((s) => s.selectManualOther);
  const clearProblemSelection = useVisitFormStore((s) => s.clearProblemSelection);
  const clearProblemsRemovedNotice = useVisitFormStore((s) => s.clearProblemsRemovedNotice);
  const applyReconciledProblemSelection = useVisitFormStore((s) => s.applyReconciledProblemSelection);
  const restrictProblemsToCrop = useVisitFormStore((s) => s.restrictProblemsToCrop);
  const setOtherProblemDescription = useVisitFormStore((s) => s.setOtherProblemDescription);

  const [formOptions, setFormOptions] = useState<VisitFormOptions | null>(null);
  const [cropsReloading, setCropsReloading] = useState(false);
  const [fieldRows, setFieldRows] = useState<unknown[]>([]);
  const [cropProblemItems, setCropProblemItems] = useState<ProblemItem[]>([]);
  const [cropItemsStatus, setCropItemsStatus] = useState<CropItemsStatus>("idle");
  const [cropItemsCropId, setCropItemsCropId] = useState("");
  const [cropItemsReload, setCropItemsReload] = useState(0);
  const [prefillWarning, setPrefillWarning] = useState("");
  const [problemQuery, setProblemQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const cropSheetRef = useRef<MasterSelectSheetRef>(null);
  const otherSectionControlRef = useRef<OtherProblemSectionRef>(null);
  const mountedRef = useRef(true);
  const didInitialScroll = useRef(false);
  const prevCropId = useRef(cropId);
  const latestCropId = useRef(cropId);
  latestCropId.current = cropId;

  const manualOtherActive = isOtherCategory(problemCategoryCode);
  const activeCrops = useMemo(
    () => (formOptions?.crops ?? []) as unknown as CropMasterRow[],
    [formOptions?.crops]
  );
  const cropsStatus: CropOptionsStatus =
    !formOptions || cropsReloading ? "loading" : activeCrops.length ? "ready" : "error";
  const problemsVerified = cropItemsStatus === "ready" && cropItemsCropId === cropId && !!cropId;
  const hasMappedProblems = useMemo(() => cropHasMappedProblems(cropProblemItems), [cropProblemItems]);

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

  useEffect(() => {
    if (!didInitialScroll.current) {
      didInitialScroll.current = true;
      scrollToRegisteredSection(scrollRef, sectionOffsets, "crop", 16, 280);
    }
  }, []);

  useEffect(() => {
    if (!cropId) {
      setCropProblemItems([]);
      setCropItemsCropId("");
      setCropItemsStatus("idle");
      return;
    }
    const requested = cropId;
    setCropItemsStatus("loading");
    loadCropProblemItems(requested)
      .then((items) => {
        if (!mountedRef.current || latestCropId.current !== requested) return;
        setCropProblemItems(filterActiveProblemItems(items));
        setCropItemsCropId(requested);
        setCropItemsStatus("ready");
      })
      .catch(() => {
        if (!mountedRef.current || latestCropId.current !== requested) return;
        setCropProblemItems([]);
        setCropItemsCropId(requested);
        setCropItemsStatus("error");
      });
  }, [cropId, cropItemsReload]);

  // Selections (drafts, revisits, previous crop) must belong to this crop's allowed list.
  useEffect(() => {
    if (!problemsVerified) return;
    restrictProblemsToCrop(cropProblemItems.map((item) => item.id));
  }, [cropProblemItems, problemsVerified, restrictProblemsToCrop]);

  useEffect(() => {
    if (cropId && cropId !== prevCropId.current) {
      prevCropId.current = cropId;
      scrollToRegisteredSection(scrollRef, sectionOffsets, "problem", 16, 200);
    }
    if (!cropId) prevCropId.current = "";
  }, [cropId]);

  const visibleCategoryCells = useMemo(() => getVisibleCategoryCells(cropProblemItems), [cropProblemItems]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cell of visibleCategoryCells) {
      counts[cell.code] = countItemsForCategory(cell.code, cropProblemItems);
    }
    return counts;
  }, [cropProblemItems, visibleCategoryCells]);

  const filteredItems = useMemo(
    () => filterStep2Problems(cropProblemItems, { categoryCode: categoryFilter, search: problemQuery }),
    [categoryFilter, cropProblemItems, problemQuery]
  );

  const suggestedItems = useMemo(() => {
    if (problemQuery.trim() || categoryFilter || manualOtherActive) return [];
    return pickSuggestedProblems(cropProblemItems, 3);
  }, [categoryFilter, cropProblemItems, manualOtherActive, problemQuery]);

  const listItems = useMemo(() => {
    const suggestedIds = new Set(suggestedItems.map((item) => item.id));
    return filteredItems.filter((item) => !suggestedIds.has(item.id));
  }, [filteredItems, suggestedItems]);

  const cropSheetItems = useMemo(
    () =>
      (formOptions?.crops ?? []).map((c) => ({
        id: String(c.id),
        title: getOptionLabel(c),
        subtitle: c.name_ta || undefined
      })),
    [formOptions?.crops]
  );

  useEffect(() => {
    if (!formOptions?.problem_categories?.length) return;
    syncProblemCategoryFromMasters(formOptions.problem_categories);
  }, [formOptions?.problem_categories, syncProblemCategoryFromMasters]);

  const selectedIds = useMemo(
    () => new Set((selectedProblems ?? []).map((item) => item.id)),
    [selectedProblems]
  );

  const groupedItems = useMemo(
    () => groupProblemsByCategory(listItems, language),
    [language, listItems]
  );

  useEffect(() => {
    if (!pendingProblemMasterId || selectedProblem || !problemsVerified) return;
    const item = findProblemItemById(cropProblemItems, pendingProblemMasterId);
    if (item) {
      selectProblemItem(item, formOptions?.problem_categories ?? []);
      setPrefillWarning("");
      return;
    }
    applyReconciledProblemSelection(idsFromRecords(cropProblemItems));
    setPrefillWarning(t("visitFlow.staleProblemMaster"));
  }, [
    applyReconciledProblemSelection,
    cropProblemItems,
    formOptions?.problem_categories,
    pendingProblemMasterId,
    problemsVerified,
    selectProblemItem,
    selectedProblem,
    t
  ]);

  useEffect(() => {
    const catalog = formOptions?.problem_items?.length ? formOptions.problem_items : cropProblemItems;
    if (!catalog.length) return;
    applyReconciledProblemSelection(idsFromRecords(catalog));
  }, [applyReconciledProblemSelection, cropProblemItems, formOptions?.problem_items]);

  const selectedCount = (selectedProblems ?? []).length;

  const canContinue = useMemo(() => {
    if (!cropId) return false;
    if (selectedCount > 0) return problemsVerified;
    if (manualOtherActive) return otherProblemDescription.trim().length > 0;
    return false;
  }, [cropId, manualOtherActive, otherProblemDescription, problemsVerified, selectedCount]);

  const continueHint = useMemo(() => {
    if (!cropId) return t("visitFlow.hintSelectCrop");
    if (selectedCount > 0) {
      if (problemsVerified) return "";
      return cropItemsStatus === "error"
        ? t("visitFlow.hintRetryProblems")
        : t("visitFlow.hintCheckingProblems");
    }
    if (manualOtherActive && !otherProblemDescription.trim()) return t("visitFlow.hintDescribeManual");
    return t("visitFlow.hintSelectOrDescribe");
  }, [cropId, cropItemsStatus, manualOtherActive, otherProblemDescription, problemsVerified, selectedCount, t]);

  const cropInlineHint = !cropId && cropsStatus === "ready" ? t("visitFlow.errSelectCrop") : "";
  const problemInlineHint =
    problemsVerified && !canContinue && !manualOtherActive && !selectedCount
      ? t("visitFlow.errSelectProblem")
      : manualOtherActive && !otherProblemDescription.trim() && !selectedCount
        ? t("visitFlow.errDescribeProblem")
        : "";

  function handleCropSelect(nextCropId: string, nextCropName: string) {
    const cropPk = extractMasterPk(nextCropId);
    if (cropPk == null) return;
    setPrefillWarning("");
    setProblemQuery("");
    setCategoryFilter(null);
    setCrop(String(cropPk), nextCropName);
  }

  function handleSelectProblem(item: ProblemItem) {
    setPrefillWarning("");
    toggleProblemItem(item, formOptions?.problem_categories ?? []);
  }

  function handleManualOther() {
    setPrefillWarning("");
    selectManualOther();
    scrollToRegisteredSection(scrollRef, sectionOffsets, "other", 16, 180);
    setTimeout(() => otherSectionControlRef.current?.focusInput(), 320);
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

  function retryProblems() {
    setCropItemsReload((n) => n + 1);
  }

  function continueToStep3() {
    if (!canContinue) return;
    setStep(3);
  }

  function renderProblemList(items: ProblemItem[], showCategory: boolean) {
    if (!items.length) return null;
    return items.map((item) => (
      <ProblemSelectCard
        key={item.id}
        item={item}
        showCategory={showCategory}
        selected={selectedIds.has(item.id)}
        onPress={() => handleSelectProblem(item)}
      />
    ));
  }

  function renderProblemBody() {
    if (!cropId) {
      return (
        <View style={styles.stateCard}>
          <Ionicons name="leaf-outline" size={20} color={Colors.text4} />
          <Text style={styles.stateText}>{t("visitFlow.selectCropFirst")}</Text>
        </View>
      );
    }
    if (cropItemsStatus === "error" && cropItemsCropId === cropId) {
      return (
        <View style={[styles.stateCard, styles.errorCard]} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={20} color={Colors.redText} />
          <View style={styles.stateCopy}>
            <Text style={styles.errorTitle}>{t("visitFlow.problemsLoadFailed", { crop: cropName })}</Text>
            <Text style={styles.errorSub}>{t("visitFlow.problemsLoadFailedSub")}</Text>
            <PrimaryButton
              label={t("visitFlow.retry")}
              onPress={retryProblems}
              variant="outline"
              icon={<Ionicons name="refresh" size={18} color={Colors.text1} />}
              style={styles.stateBtn}
            />
          </View>
        </View>
      );
    }
    if (!problemsVerified) {
      return (
        <View style={styles.stateCard} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={Colors.brand700} />
          <Text style={styles.stateText}>{t("visitFlow.loadingProblemsFor", { crop: cropName })}</Text>
        </View>
      );
    }
    if (!hasMappedProblems) {
      return (
        <View style={[styles.stateCard, styles.emptyCard]}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.amberText} />
          <View style={styles.stateCopy}>
            <Text style={styles.emptyTitle}>{t("visitFlow.noMappedProblems")}</Text>
            <Text style={styles.emptySub}>{t("visitFlow.noMappedProblemsSub")}</Text>
            {!manualOtherActive ? (
              <PrimaryButton
                label={t("visitFlow.describeManually")}
                onPress={handleManualOther}
                variant="outline"
                icon={<Ionicons name="create-outline" size={18} color={Colors.text1} />}
                style={styles.stateBtn}
              />
            ) : null}
          </View>
        </View>
      );
    }
    return (
      <>
        <SearchBar
          value={problemQuery}
          onChangeText={setProblemQuery}
          placeholder={t("visitFlow.searchTamilEnglish")}
        />

        <ProblemCategoryChips
          categories={visibleCategoryCells}
          activeCode={categoryFilter}
          onSelect={setCategoryFilter}
          counts={categoryCounts}
          totalCount={cropProblemItems.length}
        />

        {suggestedItems.length > 0 ? (
          <View style={styles.suggestedBlock}>
            <Text style={styles.groupLabel}>{t("visitFlow.suggestedForArea")}</Text>
            <View style={styles.list}>{renderProblemList(suggestedItems, true)}</View>
          </View>
        ) : null}

        {listItems.length > 0 ? (
          <View style={styles.list}>
            {categoryFilter
              ? renderProblemList(listItems, false)
              : groupedItems.map((group) => (
                  <View key={group.code} style={styles.group}>
                    <Text style={styles.groupLabel}>{group.label}</Text>
                    {renderProblemList(group.items, false)}
                  </View>
                ))}
          </View>
        ) : suggestedItems.length === 0 ? (
          <Text style={styles.hint}>
            {problemQuery.trim() ? t("visitFlow.noProblemsMatch") : t("visitFlow.noProblemsInCategory")}
          </Text>
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <VisitFlowHeader
        title={t("visitFlow.cropAndProblem")}
        subtitle={t("visitFlow.step2of4")}
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
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeInSection replayKey={replayKey} delay={entranceStagger(1)} variant="card">
        <View onLayout={sectionLayoutHandler(sectionOffsets, "crop")}>
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
        </View>

        <View onLayout={sectionLayoutHandler(sectionOffsets, "problem")} style={styles.problemSection}>
          <View style={styles.problemHead}>
            <View style={styles.countRow}>
              <Text style={styles.sectionLabel}>{t("visitFlow.problemsObserved")}</Text>
              {selectedCount > 0 ? (
                <Pressable
                  onPress={clearProblemSelection}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("visitFlow.clearSelected")}
                >
                  <Text style={styles.clearText}>{t("visitFlow.clearSelected")}</Text>
                </Pressable>
              ) : null}
            </View>
            {cropId && problemsVerified && hasMappedProblems ? (
              <Text style={styles.helperText}>{t("visitFlow.problemsHelper", { crop: cropName })}</Text>
            ) : null}
          </View>

          {selectedCount > 0 ? (
            <View style={styles.selectedSummary}>
              <Text style={styles.countText}>{t("visitFlow.selectedCount", { count: selectedCount })}</Text>
              {(selectedProblems ?? []).map((item) => (
                <View key={item.id} style={styles.selectedSummaryRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                  <Text style={styles.selectedSummaryLine} numberOfLines={2}>
                    {displayProblemLabel(item, language)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {needsProblemReview || prefillWarning ? (
            <View style={styles.warningBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.amberText} />
              <Text style={styles.warningText}>{prefillWarning || t("visitFlow.staleProblemMaster")}</Text>
            </View>
          ) : null}

          {problemsRemovedNotice ? (
            <View style={styles.warningBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.amberText} />
              <Text style={styles.warningText}>
                {t("visitFlow.problemsRemoved", { count: problemsRemovedNotice })}
              </Text>
              <Pressable
                onPress={clearProblemsRemovedNotice}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              >
                <Ionicons name="close" size={16} color={Colors.amberText} />
              </Pressable>
            </View>
          ) : null}

          {renderProblemBody()}

          {problemInlineHint ? <Text style={styles.inlineError}>{problemInlineHint}</Text> : null}
        </View>
        </FadeInSection>

        <FadeInSection replayKey={replayKey} delay={entranceStagger(2)} variant="card">
        <View onLayout={sectionLayoutHandler(sectionOffsets, "other")}>
          {cropId ? (
            <OtherProblemSection
              ref={otherSectionControlRef}
              active={manualOtherActive}
              description={otherProblemDescription}
              onActivate={handleManualOther}
              onChangeDescription={setOtherProblemDescription}
            />
          ) : null}
        </View>
        </FadeInSection>

        <View onLayout={sectionLayoutHandler(sectionOffsets, "continue")} style={styles.footerSpacer} />
      </ScrollView>

      <VisitBottomFooter hint={!canContinue ? continueHint : undefined}>
        <PrimaryButton
          label={t("visitFlow.continue")}
          onPress={continueToStep3}
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
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  stepWrap: {
    paddingBottom: 8,
    paddingHorizontal: Spacing.screen
  },
  revisitContextWrap: {
    paddingBottom: 8,
    paddingHorizontal: Spacing.screen
  },
  scroll: {
    gap: 16,
    paddingBottom: VISIT_FOOTER_SCROLL_SPACE,
    paddingHorizontal: Spacing.screen
  },
  problemSection: {
    gap: 12,
    marginTop: 16
  },
  problemHead: {
    gap: 4
  },
  sectionLabel: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  helperText: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  countRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  countText: {
    color: Colors.greenText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  clearText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  selectedSummary: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  selectedSummaryRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6
  },
  selectedSummaryLine: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  group: {
    gap: 8,
    marginTop: 8
  },
  groupLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  stateCard: {
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  stateCopy: {
    flex: 1,
    gap: 4
  },
  stateText: {
    color: Colors.text3,
    flex: 1,
    fontSize: FontSize.sm
  },
  stateBtn: {
    alignSelf: "flex-start",
    marginTop: 6
  },
  errorCard: {
    backgroundColor: Colors.redBg,
    borderColor: Colors.redBg
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
  emptyCard: {
    backgroundColor: Colors.amberBg,
    borderColor: Colors.amberBg
  },
  emptyTitle: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  emptySub: {
    color: Colors.amberText,
    fontSize: FontSize.sm
  },
  hint: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  inlineError: {
    color: Colors.redText,
    fontSize: FontSize.sm,
    marginTop: 4
  },
  warningBanner: {
    alignItems: "center",
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  warningText: {
    color: Colors.amberText,
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  suggestedBlock: {
    gap: 8
  },
  list: {
    gap: 8
  },
  footerSpacer: {
    height: 8
  },
  footerBtn: {
    width: "100%"
  }
});
