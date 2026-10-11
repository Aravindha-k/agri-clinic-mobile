import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ProblemItem } from "../../../src/api/problems";
import { useI18n } from "../../../src/i18n/I18nContext";
import { categoryCodesAreEquivalent } from "../../../src/utils/problemItemFilter";
import { VisitFarmerSummaryCard } from "../../components/visit/VisitFarmerSummaryCard";
import { VisitRevisitContextCard } from "../../components/visit/VisitRevisitContextCard";
import {
  OtherProblemSection,
  type OtherProblemSectionRef
} from "../../components/visit/step2/OtherProblemSection";
import { ProblemSelectCard } from "../../components/visit/step2/ProblemSelectCard";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { PrimaryButton, SearchBar } from "../../components/ui";
import { VisitFlowHeader } from "../../components/visit/VisitFlowHeader";
import { VisitBottomFooter } from "../../components/visit/VisitBottomFooter";
import { filterActiveProblemItems, isOtherCategory } from "../../lib/problemCatalog";
import {
  loadCropProblemItems,
  loadVisitFormOptions,
  refreshAuthoritativeVisitFormOptions,
  type VisitFormOptions
} from "../../lib/visitFormOptionsApi";
import { useVisitFormStore } from "../../store/visitFormStore";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import { useVisitEntranceKey } from "../../context/VisitEntranceContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

export type ProblemStepKind = "pest" | "disease";

type Props = {
  kind: ProblemStepKind;
  onBack: () => void;
  onContinue: () => void;
};

/** Category codes shown on each screen, in display order. */
const SCREEN_CATEGORIES: Record<ProblemStepKind, string[]> = {
  pest: ["pest"],
  disease: ["disease"]
};

const OTHER_SECTION_CATEGORIES = ["nutrient", "nutrient_issue", "nutrient_deficiency"];

function itemInCategories(item: ProblemItem, categories: string[]): boolean {
  return categories.some(
    (code) =>
      categoryCodesAreEquivalent(item.category, code) ||
      categoryCodesAreEquivalent(item.category_code, code)
  );
}

/**
 * Shared problem-selection screen for the six-step flow.
 * Step 3 = Pest, Step 4 = Disease & other issues (disease list + nutrient
 * group + manual "other" description). Selection state lives in the shared
 * visitFormStore, so backward navigation never loses picks.
 */
export function ProblemStepScreen({ kind, onBack, onContinue }: Props) {
  const { t } = useI18n();
  const replayKey = useVisitEntranceKey();
  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const revisitContext = useVisitFormStore((s) => s.revisitContext);
  const cropId = useVisitFormStore((s) => s.cropId);
  const cropName = useVisitFormStore((s) => s.cropName);  // used in load-state copy
  const selectedProblems = useVisitFormStore((s) => s.selectedProblems);
  const problemCategoryCode = useVisitFormStore((s) => s.problemCategoryCode);
  const otherProblemDescription = useVisitFormStore((s) => s.otherProblemDescription);
  const needsProblemReview = useVisitFormStore((s) => s.needsProblemReview);
  const problemsRemovedNotice = useVisitFormStore((s) => s.problemsRemovedNotice);
  const noPestIssue = useVisitFormStore((s) => s.noPestIssue);
  const noDiseaseIssue = useVisitFormStore((s) => s.noDiseaseIssue);
  const toggleProblemItem = useVisitFormStore((s) => s.toggleProblemItem);
  const clearProblemsInCategories = useVisitFormStore((s) => s.clearProblemsInCategories);
  const clearProblemsRemovedNotice = useVisitFormStore((s) => s.clearProblemsRemovedNotice);
  const selectManualOther = useVisitFormStore((s) => s.selectManualOther);
  const setOtherProblemDescription = useVisitFormStore((s) => s.setOtherProblemDescription);
  const setNoPestIssue = useVisitFormStore((s) => s.setNoPestIssue);
  const setNoDiseaseIssue = useVisitFormStore((s) => s.setNoDiseaseIssue);

  const step = kind === "pest" ? 3 : 4;
  const categories = SCREEN_CATEGORIES[kind];
  const noIssue = kind === "pest" ? noPestIssue : noDiseaseIssue;
  const setNoIssue = kind === "pest" ? setNoPestIssue : setNoDiseaseIssue;

  const [formOptions, setFormOptions] = useState<VisitFormOptions | null>(null);
  const [cropProblemItems, setCropProblemItems] = useState<ProblemItem[]>([]);
  const [itemsStatus, setItemsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [itemsCropId, setItemsCropId] = useState("");
  const [itemsReload, setItemsReload] = useState(0);
  const [problemQuery, setProblemQuery] = useState("");
  const [prefillWarning, setPrefillWarning] = useState("");
  const mountedRef = useRef(true);
  const otherSectionRef = useRef<OtherProblemSectionRef>(null);

  const manualOtherActive = isOtherCategory(problemCategoryCode);
  const problemsVerified = itemsStatus === "ready" && itemsCropId === cropId && !!cropId;

  useEffect(() => {
    mountedRef.current = true;
    void loadVisitFormOptions().then((opts) => {
      if (mountedRef.current) setFormOptions(opts);
    });
    void refreshAuthoritativeVisitFormOptions().then((fresh) => {
      if (mountedRef.current && fresh) setFormOptions(fresh);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
        if (!mountedRef.current) return;
        setCropProblemItems(filterActiveProblemItems(items));
        setItemsCropId(requested);
        setItemsStatus("ready");
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setCropProblemItems([]);
        setItemsCropId(requested);
        setItemsStatus("error");
      });
  }, [cropId, itemsReload]);

  const sectionItems = useMemo(() => {
    const query = problemQuery.trim().toLowerCase();
    return cropProblemItems.filter((item) => {
      if (!itemInCategories(item, categories)) return false;
      if (!query) return true;
      return `${item.name ?? ""} ${item.tamil_name ?? ""}`.toLowerCase().includes(query);
    });
  }, [categories, cropProblemItems, problemQuery]);

  const nutrientItems = useMemo(() => {
    if (kind !== "disease") return [];
    const query = problemQuery.trim().toLowerCase();
    return cropProblemItems.filter((item) => {
      if (!itemInCategories(item, OTHER_SECTION_CATEGORIES)) return false;
      if (!query) return true;
      return `${item.name ?? ""} ${item.tamil_name ?? ""}`.toLowerCase().includes(query);
    });
  }, [cropProblemItems, kind, problemQuery]);

  const screenSelectedCount = useMemo(
    () =>
      (selectedProblems ?? []).filter(
        (item) =>
          itemInCategories(item, categories) ||
          (kind === "disease" && itemInCategories(item, OTHER_SECTION_CATEGORIES))
      ).length,
    [categories, kind, selectedProblems]
  );

  const otherDone =
    kind === "disease" && manualOtherActive && otherProblemDescription.trim().length > 0;

  const canContinue =
    problemsVerified && (noIssue || screenSelectedCount > 0 || Boolean(otherDone));
  const blockedByOther =
    kind === "disease" && manualOtherActive && !otherProblemDescription.trim() && !noIssue;

  const continueHint = useMemo(() => {
    if (!problemsVerified) return "";
    if (noIssue || screenSelectedCount > 0 || otherDone) return "";
    if (blockedByOther) return t("visitFlow.hintDescribeManual");
    return t(kind === "pest" ? "visitFlow.hintPestOrSkip" : "visitFlow.hintDiseaseOrSkip");
  }, [blockedByOther, kind, noIssue, otherDone, problemsVerified, screenSelectedCount, t]);

  function handleSelectItem(item: ProblemItem) {
    setPrefillWarning("");
    toggleProblemItem(item, formOptions?.problem_categories ?? []);
    if (noIssue) setNoIssue(false);
  }

  function handleToggleNoIssue() {
    if (noIssue) {
      setNoIssue(false);
      return;
    }
    clearProblemsInCategories(kind === "pest" ? categories : [...categories, ...OTHER_SECTION_CATEGORIES]);
    setNoIssue(true);
  }

  function handleManualOther() {
    selectManualOther();
    setTimeout(() => otherSectionRef.current?.focusInput(), 250);
  }

  function SectionHeader({
    icon,
    label,
    count
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    count?: number;
  }) {
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={15} color={Colors.brand700} />
        </View>
        <Text style={styles.sectionLabel}>{label}</Text>
        {count ? (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{t("visitFlow.selectedCount", { count })}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  function renderList(items: ProblemItem[]) {
    const selectedIds = new Set((selectedProblems ?? []).map((row) => row.id));
    return items.map((item) => (
      <ProblemSelectCard
        key={item.id}
        item={item}
        selected={selectedIds.has(item.id)}
        onPress={() => handleSelectItem(item)}
      />
    ));
  }

  function renderBody() {
    if (!cropId) {
      return (
        <View style={styles.stateCard}>
          <Ionicons name="leaf-outline" size={20} color={Colors.text4} />
          <Text style={styles.stateText}>{t("visitFlow.selectCropFirst")}</Text>
        </View>
      );
    }
    if (itemsStatus === "error" && itemsCropId === cropId) {
      return (
        <View style={[styles.stateCard, styles.errorCard]} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={20} color={Colors.redText} />
          <View style={styles.stateCopy}>
            <Text style={styles.errorTitle}>{t("visitFlow.problemsLoadFailed", { crop: cropName })}</Text>
            <Text style={styles.errorSub}>{t("visitFlow.problemsLoadFailedSub")}</Text>
            <PrimaryButton
              label={t("visitFlow.retry")}
              onPress={() => setItemsReload((n) => n + 1)}
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
    return (
      <>
        <SearchBar
          value={problemQuery}
          onChangeText={setProblemQuery}
          placeholder={t("visitFlow.searchTamilEnglish")}
        />
        {sectionItems.length > 0 ? (
          <View style={styles.list}>{renderList(sectionItems)}</View>
        ) : (
          <Text style={styles.hint}>
            {problemQuery.trim()
              ? t("visitFlow.noProblemsMatch")
              : t("visitFlow.noProblemsInCategory")}
          </Text>
        )}
        {kind === "disease" ? (
          <>
            <SectionHeader icon="nutrition-outline" label={t("visitFlow.nutrientOtherGroup")} />
            {nutrientItems.length > 0 ? (
              <View style={styles.list}>{renderList(nutrientItems)}</View>
            ) : null}
            <OtherProblemSection
              ref={otherSectionRef}
              active={manualOtherActive}
              description={otherProblemDescription}
              onActivate={handleManualOther}
              onChangeDescription={setOtherProblemDescription}
            />
          </>
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <VisitFlowHeader
        title={t(kind === "pest" ? "visitFlow.pestTitle" : "visitFlow.diseaseTitle")}
        subtitle={t(kind === "pest" ? "visitFlow.step3of6" : "visitFlow.step4of6")}
        onBack={onBack}
        icon={kind === "pest" ? "bug-outline" : "medkit-outline"}
      />

      <View style={styles.stepWrap}>
        <StepIndicator step={step} />
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
          <Pressable
            onPress={handleToggleNoIssue}
            style={({ pressed }) => [
              styles.noIssueRow,
              noIssue && styles.noIssueRowActive,
              pressed && styles.cardPressed
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: noIssue }}
            accessibilityLabel={t(
              kind === "pest" ? "visitFlow.noPestIssue" : "visitFlow.noDiseaseIssue"
            )}
          >
            <View style={styles.noIssueIconWrap}>
              <Ionicons
                name={kind === "pest" ? "bug-outline" : "leaf-outline"}
                size={18}
                color={noIssue ? Colors.brand700 : Colors.text3}
              />
            </View>
            <Text style={[styles.noIssueText, noIssue && styles.noIssueTextActive]}>
              {t(kind === "pest" ? "visitFlow.noPestIssue" : "visitFlow.noDiseaseIssue")}
            </Text>
            <Ionicons
              name={noIssue ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={noIssue ? Colors.brand700 : Colors.text4}
            />
          </Pressable>

          <SectionHeader
            icon={kind === "pest" ? "bug-outline" : "medkit-outline"}
            label={t(kind === "pest" ? "visitFlow.pestSection" : "visitFlow.diseaseSection")}
            count={screenSelectedCount}
          />

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

          {renderBody()}
        </FadeInSection>
        <View style={styles.footerSpacer} />
      </ScrollView>

      <VisitBottomFooter hint={!canContinue ? continueHint : undefined}>
        <PrimaryButton
          label={t("visitFlow.continue")}
          onPress={() => {
            if (canContinue) onContinue();
          }}
          disabled={!canContinue}
          style={styles.footerBtn}
        />
      </VisitBottomFooter>
    </View>
  );
}

export function VisitCreateStep3Pest({ onBack }: { onBack: () => void }) {
  const setStep = useVisitFormStore((s) => s.setStep);
  return <ProblemStepScreen kind="pest" onBack={onBack} onContinue={() => setStep(4)} />;
}

export function VisitCreateStep4Disease({ onBack }: { onBack: () => void }) {
  const setStep = useVisitFormStore((s) => s.setStep);
  return <ProblemStepScreen kind="disease" onBack={onBack} onContinue={() => setStep(5)} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  stepWrap: { paddingHorizontal: Spacing.screen, paddingBottom: Spacing.xs },
  revisitContextWrap: { marginHorizontal: Spacing.screen, marginBottom: Spacing.sm },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screen, paddingBottom: Spacing.xxl },
  noIssueRow: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    minHeight: 56,
    paddingHorizontal: Spacing.md
  },
  noIssueRowActive: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.brand700,
    borderWidth: 1.5
  },
  cardPressed: { opacity: 0.92 },
  noIssueIconWrap: {
    alignItems: "center",
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  noIssueText: {
    color: Colors.text2,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium
  },
  noIssueTextActive: { color: Colors.brand700, fontWeight: FontWeight.semibold },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm
  },
  sectionIconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.pill,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  sectionLabel: {
    color: Colors.text3,
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  countPill: {
    backgroundColor: Colors.greenBg,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2
  },
  countPillText: { color: Colors.brand700, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  list: { gap: Spacing.xs, marginTop: Spacing.xs },
  hint: { color: Colors.text3, fontSize: FontSize.sm, marginTop: Spacing.sm },
  stateCard: {
    alignItems: "center",
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.md
  },
  errorCard: { backgroundColor: Colors.redBg },
  stateCopy: { flex: 1 },
  stateText: { color: Colors.text3, flex: 1, fontSize: FontSize.sm },
  errorTitle: { color: Colors.redText, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  errorSub: { color: Colors.text3, fontSize: FontSize.xs, marginTop: 2 },
  stateBtn: { alignSelf: "flex-start", marginTop: Spacing.sm },
  warningBanner: {
    alignItems: "center",
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: 6,
    marginVertical: Spacing.xs,
    padding: Spacing.sm
  },
  warningText: { color: Colors.amberText, flex: 1, fontSize: FontSize.sm },
  footerSpacer: { height: 96 },
  footerBtn: { width: "100%" }
});
