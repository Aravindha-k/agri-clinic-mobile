import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getOptionLabel } from "../../../src/api/masters";
import type { ProblemItem } from "../../../src/api/problems";
import { extractMasterPk } from "../../../src/utils/masterId";
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
import { StepIndicator } from "../../components/visit/StepIndicator";
import { PrimaryButton, SearchBar } from "../../components/ui";
import { VisitFlowHeader } from "../../components/visit/VisitFlowHeader";
import {
  VisitBottomFooter,
  VISIT_FOOTER_SCROLL_SPACE
} from "../../components/visit/VisitBottomFooter";
import {
  cropHasMappedProblems,
  filterStep2Problems,
  findProblemItemById,
  formatCategoryBadge,
  getVisibleCategoryCells,
  groupProblemsByCategory,
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
import { EntranceBlocks } from "../../components/ui/EntranceBlocks";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import { useVisitEntranceKey } from "../../context/VisitEntranceContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

const CATALOG_DEBOUNCE_MS = 250;

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
    if (!pendingProblemMasterId || selectedProblem || !cropId) return;
    const item = findProblemItemById(prefillPool, pendingProblemMasterId);
    if (item) {
      selectProblemItem(item, formOptions?.problem_categories ?? []);
      setPrefillWarning("");
      setShowProblemPicker(true);
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
    selectedProblem,
    t
  ]);

  const canContinue = useMemo(() => {
    if (!cropId) return false;
    if ((selectedProblems ?? []).length > 0) return true;
    if (manualOtherActive) return otherProblemDescription.trim().length > 0;
    return false;
  }, [cropId, manualOtherActive, otherProblemDescription, selectedProblems]);

  const continueHint = useMemo(() => {
    if (!cropId) return t("visitFlow.hintSelectCrop");
    if ((selectedProblems ?? []).length > 0) return "";
    if (manualOtherActive && !otherProblemDescription.trim()) return t("visitFlow.hintDescribeManual");
    return t("visitFlow.hintSelectOrDescribe");
  }, [cropId, manualOtherActive, otherProblemDescription, selectedProblems, t]);

  const cropInlineHint = !cropId ? t("visitFlow.errSelectCrop") : "";
  const problemInlineHint =
    cropId && !canContinue && !manualOtherActive && !(selectedProblems ?? []).length
      ? t("visitFlow.errSelectProblem")
      : manualOtherActive && !otherProblemDescription.trim() && !(selectedProblems ?? []).length
        ? t("visitFlow.errDescribeProblem")
        : "";

  function handleCropSelect(nextCropId: string, nextCropName: string) {
    const cropPk = extractMasterPk(nextCropId);
    if (cropPk == null) return;
    setSearchAllMode(false);
    setPrefillWarning("");
    setProblemQuery("");
    setCategoryFilter(null);
    setShowProblemPicker(true);
    setCrop(String(cropPk), nextCropName);
  }

  function handleSelectProblem(item: ProblemItem) {
    setPrefillWarning("");
    toggleProblemItem(item, formOptions?.problem_categories ?? []);
    setShowProblemPicker(true);
  }

  function handleManualOther() {
    setPrefillWarning("");
    setShowProblemPicker(true);
    selectManualOther();
    scrollToRegisteredSection(scrollRef, sectionOffsets, "other", 16, 180);
    setTimeout(() => otherSectionControlRef.current?.focusInput(), 320);
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
        selected={selectedIds.has(item.id)}
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
      <VisitFlowHeader
        title={t("visitFlow.cropAndProblem")}
        subtitle={t("visitFlow.step2of4")}
        onBack={onBack}
      />

      <FadeInSection replayKey={replayKey} delay={entranceStagger(0)} variant="card">
      <VisitFarmerSummaryCard farmer={farmer} newFarmer={newFarmer} />
      {revisitContext ? (
        <View style={styles.revisitContextWrap}>
          <VisitRevisitContextCard context={revisitContext} />
        </View>
      ) : null}
      </FadeInSection>

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
        <FadeInSection replayKey={replayKey} delay={entranceStagger(1)} variant="card">
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
              <View style={styles.problemHead}>
                <Text style={styles.sectionLabel}>{t("visitFlow.problemsObserved")}</Text>
                {(selectedProblems ?? []).length > 0 ? (
                  <View style={styles.countRow}>
                    <Text style={styles.countText}>
                      {t("visitFlow.selectedCount", { count: selectedProblems.length })}
                    </Text>
                    <Pressable onPress={clearProblemSelection} hitSlop={8}>
                      <Text style={styles.clearText}>{t("visitFlow.clearSelected")}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {(selectedProblems ?? []).length > 0 ? (
                <View style={styles.selectedSummary}>
                  {(selectedProblems ?? []).map((item) => (
                    <Text key={item.id} style={styles.selectedSummaryLine} numberOfLines={1}>
                      {item.tamil_name?.trim() || item.name}
                    </Text>
                  ))}
                </View>
              ) : null}

              {problemsRemovedNotice ? (
                <View style={styles.warningBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.amberText} />
                  <Text style={styles.warningText}>
                    {t("visitFlow.problemsRemoved", { count: problemsRemovedNotice })}
                  </Text>
                  <Pressable onPress={clearProblemsRemovedNotice} hitSlop={8}>
                    <Ionicons name="close" size={16} color={Colors.amberText} />
                  </Pressable>
                </View>
              ) : null}

              {showProblemPicker ? (
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
                    <View style={styles.list}>
                      {categoryFilter
                        ? renderProblemList(listItems)
                        : groupedItems.map((group) => (
                            <View key={group.code} style={styles.group}>
                              <Text style={styles.groupLabel}>{group.label}</Text>
                              {renderProblemList(group.items)}
                            </View>
                          ))}
                    </View>
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
    gap: 14,
    paddingBottom: VISIT_FOOTER_SCROLL_SPACE,
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
  problemHead: {
    gap: 6
  },
  countRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  countText: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  selectedSummaryLine: {
    color: Colors.text1,
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
    textTransform: "uppercase"
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
  footerBtn: {
    width: "100%"
  }
});
