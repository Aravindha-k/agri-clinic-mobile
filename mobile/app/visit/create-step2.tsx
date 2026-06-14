import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getOptionLabel } from "../../../src/api/masters";
import type { ProblemItem } from "../../../src/api/problems";
import { useI18n } from "../../../src/i18n/I18nContext";
import { VisitFarmerSummaryCard } from "../../components/visit/VisitFarmerSummaryCard";
import { VisitRevisitContextCard } from "../../components/visit/VisitRevisitContextCard";
import { CropSelectionCard } from "../../components/visit/step2/CropSelectionCard";
import { MasterSelectSheet, type MasterSelectSheetRef } from "../../components/visit/MasterSelectSheet";
import {
  OtherProblemSection,
  type OtherProblemSectionRef
} from "../../components/visit/step2/OtherProblemSection";
import { ProblemCategoryChips } from "../../components/visit/step2/ProblemCategoryChips";
import { ProblemSelectCard } from "../../components/visit/step2/ProblemSelectCard";
import { SelectedProblemSummary } from "../../components/visit/step2/SelectedProblemSummary";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { PrimaryButton, SearchBar } from "../../components/ui";
import {
  cropHasMappedProblems,
  filterStep2Problems,
  findProblemItemById,
  formatCategoryBadge,
  getVisibleCategoryCells,
  isOtherCategory,
  pickSuggestedProblems
} from "../../lib/problemCatalog";
import { scrollToRegisteredSection, sectionLayoutHandler } from "../../lib/smoothScroll";
import {
  loadCatalogSearchItems,
  loadCropProblemItems,
  loadFarmerFieldCrops,
  loadVisitFormOptions,
  type FarmerFieldCropChip,
  type VisitFormOptions
} from "../../lib/visitFormOptionsApi";
import { useVisitFormStore } from "../../store/visitFormStore";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

const CATALOG_DEBOUNCE_MS = 250;

type Props = {
  onBack: () => void;
};

export function VisitCreateStep2({ onBack }: Props) {
  const { t } = useI18n();
  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const cropId = useVisitFormStore((s) => s.cropId);
  const cropName = useVisitFormStore((s) => s.cropName);
  const problemCategoryId = useVisitFormStore((s) => s.problemCategoryId);
  const problemCategoryCode = useVisitFormStore((s) => s.problemCategoryCode);
  const selectedProblem = useVisitFormStore((s) => s.selectedProblem);
  const pendingProblemMasterId = useVisitFormStore((s) => s.pendingProblemMasterId);
  const otherProblemDescription = useVisitFormStore((s) => s.otherProblemDescription);
  const revisitContext = useVisitFormStore((s) => s.revisitContext);
  const setStep = useVisitFormStore((s) => s.setStep);
  const setCrop = useVisitFormStore((s) => s.setCrop);
  const setProblemCategory = useVisitFormStore((s) => s.setProblemCategory);
  const selectProblemItem = useVisitFormStore((s) => s.selectProblemItem);
  const selectManualOther = useVisitFormStore((s) => s.selectManualOther);
  const clearProblemSelection = useVisitFormStore((s) => s.clearProblemSelection);
  const setOtherProblemDescription = useVisitFormStore((s) => s.setOtherProblemDescription);

  const [formOptions, setFormOptions] = useState<VisitFormOptions | null>(null);
  const [fieldCrops, setFieldCrops] = useState<FarmerFieldCropChip[]>([]);
  const [cropProblemItems, setCropProblemItems] = useState<ProblemItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<ProblemItem[]>([]);
  const [cropItemsLoading, setCropItemsLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchAllMode, setSearchAllMode] = useState(false);
  const [prefillWarning, setPrefillWarning] = useState("");
  const [problemQuery, setProblemQuery] = useState("");
  const [debouncedCatalogQuery, setDebouncedCatalogQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showProblemPicker, setShowProblemPicker] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const cropSheetRef = useRef<MasterSelectSheetRef>(null);
  const otherSectionControlRef = useRef<OtherProblemSectionRef>(null);
  const mountedRef = useRef(true);
  const didInitialScroll = useRef(false);
  const prevCropId = useRef(cropId);

  const hasMappedProblems = useMemo(() => cropHasMappedProblems(cropProblemItems), [cropProblemItems]);
  const useCatalogPool = searchAllMode || !hasMappedProblems;
  const manualOtherActive = isOtherCategory(problemCategoryCode);

  const cropTamilName = useMemo(() => {
    if (!cropId || !formOptions?.crops) return undefined;
    const match = formOptions.crops.find((c) => String(c.id) === cropId);
    return match?.name_ta?.trim() || undefined;
  }, [cropId, formOptions?.crops]);

  useEffect(() => {
    mountedRef.current = true;
    void loadVisitFormOptions().then((opts) => {
      if (mountedRef.current) setFormOptions(opts);
    });
    if (farmer?.id) {
      void loadFarmerFieldCrops(farmer.id).then((chips) => {
        if (!mountedRef.current) return;
        if (chips.length) {
          setFieldCrops(chips);
          return;
        }
        const fallbackName = farmer.crop_name || farmer.list_crop_name;
        if (fallbackName) {
          setFieldCrops([
            {
              id: "farmer-crop",
              crop_id: "",
              crop_name: fallbackName,
              field_name: farmer.village_name || undefined
            }
          ]);
        }
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
    const timer = setTimeout(() => setDebouncedCatalogQuery(problemQuery.trim()), CATALOG_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [problemQuery]);

  useEffect(() => {
    if (!cropId) {
      setCropProblemItems([]);
      setCropItemsLoading(false);
      return;
    }
    setCropItemsLoading(true);
    void loadCropProblemItems(cropId).then((items) => {
      if (!mountedRef.current) return;
      setCropProblemItems(items);
      setCropItemsLoading(false);
      if (!cropHasMappedProblems(items)) {
        setSearchAllMode(true);
      }
    });
  }, [cropId]);

  useEffect(() => {
    if (!cropId || !useCatalogPool) return;
    setCatalogLoading(true);
    void loadCatalogSearchItems(debouncedCatalogQuery).then((items) => {
      if (!mountedRef.current) return;
      setCatalogItems(items);
      setCatalogLoading(false);
    });
  }, [cropId, debouncedCatalogQuery, useCatalogPool]);

  useEffect(() => {
    if (cropId && cropId !== prevCropId.current) {
      prevCropId.current = cropId;
      scrollToRegisteredSection(scrollRef, sectionOffsets, "problem", 16, 200);
    }
    if (!cropId) prevCropId.current = "";
  }, [cropId]);

  const itemPool = useMemo(() => {
    if (useCatalogPool) return catalogItems;
    return cropProblemItems;
  }, [catalogItems, cropProblemItems, useCatalogPool]);

  const visibleCategoryCells = useMemo(() => getVisibleCategoryCells(itemPool), [itemPool]);

  const filteredItems = useMemo(
    () => filterStep2Problems(itemPool, { categoryCode: categoryFilter, search: problemQuery }),
    [categoryFilter, itemPool, problemQuery]
  );

  const suggestedItems = useMemo(() => {
    if (useCatalogPool || problemQuery.trim() || categoryFilter || manualOtherActive) return [];
    return pickSuggestedProblems(cropProblemItems, 3);
  }, [categoryFilter, cropProblemItems, manualOtherActive, problemQuery, useCatalogPool]);

  const listItems = useMemo(() => {
    const suggestedIds = new Set(suggestedItems.map((item) => item.id));
    return filteredItems.filter((item) => !suggestedIds.has(item.id));
  }, [filteredItems, suggestedItems]);

  const prefillPool = useMemo(() => [...cropProblemItems, ...catalogItems], [catalogItems, cropProblemItems]);

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
    if (!formOptions || !problemCategoryId || problemCategoryCode) return;
    const match = formOptions.problem_categories.find((c) => String(c.id) === problemCategoryId);
    if (match) {
      setProblemCategory(String(match.id), match.code || problemCategoryId);
    }
  }, [formOptions, problemCategoryCode, problemCategoryId, setProblemCategory]);

  useEffect(() => {
    if (!pendingProblemMasterId || selectedProblem || !cropId) return;
    const item = findProblemItemById(prefillPool, pendingProblemMasterId);
    if (item) {
      selectProblemItem(item, formOptions?.problem_categories ?? []);
      setPrefillWarning("");
      setShowProblemPicker(false);
      return;
    }
    if (prefillPool.length > 0 && !cropItemsLoading) {
      setPrefillWarning(t("visitFlow.prefillWarning"));
    }
  }, [
    cropId,
    cropItemsLoading,
    formOptions?.problem_categories,
    pendingProblemMasterId,
    prefillPool,
    selectProblemItem,
    selectedProblem
  ]);

  const canContinue = useMemo(() => {
    if (!cropId) return false;
    if (manualOtherActive) return otherProblemDescription.trim().length > 0;
    return Boolean(selectedProblem);
  }, [cropId, manualOtherActive, otherProblemDescription, selectedProblem]);

  const continueHint = useMemo(() => {
    if (!cropId) return t("visitFlow.hintSelectCrop");
    if (manualOtherActive && !otherProblemDescription.trim()) return t("visitFlow.hintDescribeManual");
    if (!selectedProblem && !manualOtherActive) return t("visitFlow.hintSelectOrDescribe");
    return "";
  }, [cropId, manualOtherActive, otherProblemDescription, selectedProblem, t]);

  const cropInlineHint = !cropId ? t("visitFlow.errSelectCrop") : "";
  const problemInlineHint =
    cropId && !canContinue && !manualOtherActive && !selectedProblem
      ? t("visitFlow.errSelectProblem")
      : manualOtherActive && !otherProblemDescription.trim()
        ? t("visitFlow.errDescribeProblem")
        : "";

  function handleCropSelect(nextCropId: string, nextCropName: string) {
    setSearchAllMode(false);
    setPrefillWarning("");
    setProblemQuery("");
    setCategoryFilter(null);
    setShowProblemPicker(true);
    setCrop(nextCropId, nextCropName);
  }

  function handleSelectProblem(item: ProblemItem) {
    setPrefillWarning("");
    selectProblemItem(item, formOptions?.problem_categories ?? []);
    setShowProblemPicker(false);
    scrollToRegisteredSection(scrollRef, sectionOffsets, "continue", 8, 200);
  }

  function handleManualOther() {
    setPrefillWarning("");
    setShowProblemPicker(false);
    selectManualOther();
    scrollToRegisteredSection(scrollRef, sectionOffsets, "other", 16, 180);
    setTimeout(() => otherSectionControlRef.current?.focusInput(), 320);
  }

  function handleChangeProblem() {
    clearProblemSelection();
    setShowProblemPicker(true);
    scrollToRegisteredSection(scrollRef, sectionOffsets, "problem", 16, 120);
  }

  function handleSearchAllProblems() {
    setSearchAllMode(true);
    setCategoryFilter(null);
    setPrefillWarning("");
  }

  function continueToStep3() {
    if (!canContinue) return;
    setStep(3);
  }

  function renderProblemList(items: ProblemItem[]) {
    if (!items.length) return null;
    return items.map((item) => (
      <ProblemSelectCard
        key={item.id}
        item={item}
        cropName={cropName}
        selected={selectedProblem?.id === item.id}
        onPress={() => handleSelectProblem(item)}
      />
    ));
  }

  const showEmptyPool =
    cropId &&
    !cropItemsLoading &&
    !catalogLoading &&
    filteredItems.length === 0 &&
    suggestedItems.length === 0 &&
    !manualOtherActive &&
    showProblemPicker;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={18} color={Colors.text1} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.topBarTitle}>{t("visitFlow.cropAndProblem")}</Text>
          <Text style={styles.topBarSub}>{t("visitFlow.step2of3")}</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <VisitFarmerSummaryCard farmer={farmer} newFarmer={newFarmer} />
      {revisitContext ? (
        <View style={styles.revisitContextWrap}>
          <VisitRevisitContextCard context={revisitContext} />
        </View>
      ) : null}

      <View style={styles.stepWrap}>
        <StepIndicator step={2} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View onLayout={sectionLayoutHandler(sectionOffsets, "crop")}>
          <CropSelectionCard
            cropId={cropId}
            cropName={cropName}
            cropTamilName={cropTamilName}
            fieldCrops={fieldCrops}
            onChooseCrop={() => cropSheetRef.current?.open()}
            onQuickCrop={handleCropSelect}
          />
          {cropInlineHint ? <Text style={styles.inlineError}>{cropInlineHint}</Text> : null}
        </View>

        <View onLayout={sectionLayoutHandler(sectionOffsets, "problem")} style={styles.problemSection}>
          {!cropId ? (
            <View style={styles.waitCard}>
              <Text style={styles.waitTitle}>{t("visitFlow.selectCropFirst")}</Text>
            </View>
          ) : cropItemsLoading ? (
            <Text style={styles.hint}>{t("visitFlow.loadingProblemsFor", { crop: cropName })}</Text>
          ) : (
            <>
              <Text style={styles.sectionLabel}>{t("visitFlow.problemsFor", { crop: cropName })}</Text>

              {selectedProblem && !manualOtherActive && !showProblemPicker ? (
                <SelectedProblemSummary problem={selectedProblem} onChange={handleChangeProblem} />
              ) : null}

              {showProblemPicker && !manualOtherActive ? (
                <>
                  {!hasMappedProblems ? (
                    <View style={styles.emptyBanner}>
                      <Text style={styles.emptyBannerTitle}>{t("visitFlow.noMappedProblems")}</Text>
                      <Text style={styles.emptyBannerSub}>{t("visitFlow.searchAllOrManual")}</Text>
                      {!searchAllMode ? (
                        <Pressable onPress={handleSearchAllProblems} style={styles.emptyBannerBtn}>
                          <Text style={styles.emptyBannerBtnText}>{t("visitFlow.searchAllProblems")}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  {prefillWarning ? (
                    <View style={styles.warningBanner}>
                      <Ionicons name="alert-circle-outline" size={16} color={Colors.amberText} />
                      <Text style={styles.warningText}>{prefillWarning}</Text>
                    </View>
                  ) : null}

                  <SearchBar
                    value={problemQuery}
                    onChangeText={setProblemQuery}
                    placeholder={t("visitFlow.searchTamilEnglish")}
                  />

                  {useCatalogPool && hasMappedProblems ? (
                    <Pressable onPress={() => setSearchAllMode(false)} style={styles.linkBtn}>
                      <Text style={styles.linkBtnText}>{t("visitFlow.showCropMappedOnly")}</Text>
                    </Pressable>
                  ) : null}

                  {!useCatalogPool && hasMappedProblems ? (
                    <Pressable onPress={handleSearchAllProblems} style={styles.linkBtn}>
                      <Text style={styles.linkBtnText}>{t("visitFlow.searchAllProblems")}</Text>
                    </Pressable>
                  ) : null}

                  <ProblemCategoryChips
                    categories={visibleCategoryCells}
                    activeCode={categoryFilter}
                    onSelect={setCategoryFilter}
                  />

                  {suggestedItems.length > 0 ? (
                    <View style={styles.suggestedBlock}>
                      <Text style={styles.suggestedLabel}>{t("visitFlow.suggestedForArea")}</Text>
                      <View style={styles.list}>{renderProblemList(suggestedItems)}</View>
                    </View>
                  ) : null}

                  {listItems.length > 0 ? (
                    <View style={styles.list}>{renderProblemList(listItems)}</View>
                  ) : showEmptyPool ? (
                    <Text style={styles.hint}>
                      {problemQuery.trim()
                        ? t("visitFlow.noProblemsMatch")
                        : t("visitFlow.noProblemsInCategory")}
                    </Text>
                  ) : null}

                  {catalogLoading && useCatalogPool ? (
                    <Text style={styles.hint}>{t("visitFlow.searchingCatalog")}</Text>
                  ) : null}
                </>
              ) : null}

              {problemInlineHint ? <Text style={styles.inlineError}>{problemInlineHint}</Text> : null}
            </>
          )}
        </View>

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

        <View onLayout={sectionLayoutHandler(sectionOffsets, "continue")} style={styles.footerSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        {!canContinue && continueHint ? (
          <Text style={styles.footerHint}>{continueHint}</Text>
        ) : null}
        <PrimaryButton
          label={t("visitFlow.continue")}
          onPress={continueToStep3}
          disabled={!canContinue}
          style={styles.footerBtn}
        />
      </View>

      <MasterSelectSheet
        ref={cropSheetRef}
        title={t("visitFlow.selectCropSheet")}
        items={cropSheetItems}
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
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingBottom: 4,
    paddingHorizontal: Spacing.screen,
    paddingTop: 8
  },
  iconBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  topBarCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0
  },
  topBarTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  topBarSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
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
    gap: 14,
    paddingBottom: 120,
    paddingHorizontal: Spacing.screen
  },
  problemSection: {
    gap: 10
  },
  sectionLabel: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  waitCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14
  },
  waitTitle: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  hint: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  inlineError: {
    color: Colors.redText,
    fontSize: FontSize.sm,
    marginTop: -4
  },
  emptyBanner: {
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.lg,
    gap: 6,
    padding: 12
  },
  emptyBannerTitle: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  emptyBannerSub: {
    color: Colors.amberText,
    fontSize: FontSize.sm
  },
  emptyBannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderColor: Colors.amber,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  emptyBannerBtnText: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
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
  linkBtn: {
    alignSelf: "flex-start"
  },
  linkBtnText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  suggestedBlock: {
    gap: 8
  },
  suggestedLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  list: {
    gap: 8
  },
  footerSpacer: {
    height: 8
  },
  footer: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    bottom: 0,
    gap: 6,
    left: 0,
    padding: 12,
    paddingHorizontal: Spacing.screen,
    position: "absolute",
    right: 0
  },
  footerHint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    textAlign: "center"
  },
  footerBtn: {
    width: "100%"
  }
});
