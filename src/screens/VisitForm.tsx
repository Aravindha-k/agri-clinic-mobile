import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Farmer, getFarmer } from "../api/farmers";
import { getOptionLabel, MasterOption } from "../api/masters";
import { useMasterData } from "../storage/MasterDataContext";
import { Visit, VisitFormValues } from "../api/visits";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { AppInput } from "../components/AppInput";
import { AppSelect, SelectOption } from "../components/AppSelect";
import { ExistingFarmerPickerModal } from "../components/ExistingFarmerPickerModal";
import { FadeInView } from "../components/FadeInView";
import { ListSkeleton } from "../components/ListSkeleton";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";
import { prefillFromFarmer, VisitFormPrefill } from "../utils/farmerPrefill";
import { getForegroundLocation, toVisitLocation } from "../utils/location";

const STEPS = ["Farmer", "Crop & issue", "Advice"] as const;

const emptyValues: VisitFormValues = {
  district: "",
  village: "",
  crop: "",
  land_name: "",
  land_area: "",
  farmer_id: "",
  farmer_name: "",
  farmer_phone: "",
  next_visit_date: "",
  notes: "",
  crop_health: "",
  pest_issue: false,
  disease_issue: false,
  weed_condition: "",
  fertilizer_advice: "",
  pesticide_advice: "",
  irrigation_advice: "",
  general_advice: "",
  follow_up_required: false,
  observation: "",
  field_notes: "",
  problem_seen: "",
  action_taken: "",
  follow_up_date: ""
};

function mergePrefill(prefill?: VisitFormPrefill): VisitFormValues {
  if (!prefill) {
    return { ...emptyValues };
  }
  return {
    ...emptyValues,
    ...prefill
  };
}

export function VisitForm({
  initialVisit,
  prefill,
  submitTitle = "Submit visit",
  onSubmit
}: {
  initialVisit?: Visit;
  prefill?: VisitFormPrefill;
  submitTitle?: string;
  onSubmit: (values: VisitFormValues) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<VisitFormValues>(() => {
    if (initialVisit) {
      return {
        ...emptyValues,
        district: initialVisit.district?.toString() || "",
        village: initialVisit.village?.toString() || "",
        crop: initialVisit.crop?.toString() || "",
        land_name: initialVisit.land_name || "",
        land_area: initialVisit.land_area?.toString() || "",
        farmer_id: initialVisit.farmer?.id != null ? String(initialVisit.farmer.id) : "",
        farmer_name: initialVisit.farmer_name || initialVisit.farmer?.name || "",
        farmer_phone: initialVisit.farmer_phone || initialVisit.farmer?.phone || initialVisit.farmer?.mobile || "",
        next_visit_date: initialVisit.next_visit_date || "",
        notes: initialVisit.notes || "",
        crop_health: initialVisit.crop_health || "",
        pest_issue: Boolean(initialVisit.pest_issue),
        disease_issue: Boolean(initialVisit.disease_issue),
        weed_condition: initialVisit.weed_condition || "",
        fertilizer_advice: initialVisit.fertilizer_advice || "",
        pesticide_advice: initialVisit.pesticide_advice || "",
        irrigation_advice: initialVisit.irrigation_advice || "",
        general_advice: initialVisit.general_advice || "",
        follow_up_required: Boolean(initialVisit.follow_up_required)
      };
    }
    return mergePrefill(prefill);
  });
  const { districts, villages, crops, syncing: masterSyncing } = useMasterData();
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedFarmerName, setPickedFarmerName] = useState<string | null>(prefill?.farmer_name?.trim() || null);
  const [loadedFarmer, setLoadedFarmer] = useState<Farmer | null>(null);

  const applyFarmerFromApi = useCallback((farmer: Farmer) => {
    const next = prefillFromFarmer(farmer);
    setLoadedFarmer(farmer);
    setValues((current) => ({ ...current, ...next, farmer_id: farmer.id != null ? String(farmer.id) : "" }));
    setPickedFarmerName(farmer.name || farmer.phone || "Selected farmer");
  }, []);

  useEffect(() => {
    const raw = prefill?.farmer_id?.trim();
    if (!raw || !/^\d+$/.test(raw)) {
      return;
    }
    let cancelled = false;
    getFarmer(Number(raw))
      .then((farmer) => {
        if (!cancelled) {
          applyFarmerFromApi(farmer);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [applyFarmerFromApi, prefill?.farmer_id]);

  const masterLoading = masterSyncing && districts.length === 0;

  const districtOptions = useMemo(() => toOptions(districts), [districts]);
  const villageOptions = useMemo(() => {
    return toOptions(villages.filter((village) => !values.district || String(village.district) === values.district));
  }, [values.district, villages]);
  const cropOptions = useMemo(() => toOptions(crops), [crops]);

  const districtLabel = districtOptions.find((o) => o.value === values.district)?.label || "—";
  const villageLabel = villageOptions.find((o) => o.value === values.village)?.label || "—";
  const cropLabel = cropOptions.find((o) => o.value === values.crop)?.label || "—";

  function setField<K extends keyof VisitFormValues>(field: K, value: VisitFormValues[K]) {
    if (field === "farmer_name" || field === "farmer_phone") {
      setPickedFarmerName(null);
      setValues((current) => ({ ...current, [field]: value, farmer_id: "" }));
      return;
    }
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleDistrictChange(value: string) {
    setValues((current) => ({ ...current, district: value, village: "" }));
  }

  function selectFarmer(farmer: Farmer) {
    applyFarmerFromApi(farmer);
    if (farmer.id != null) {
      void getFarmer(farmer.id)
        .then(applyFarmerFromApi)
        .catch(() => {});
    }
  }

  function clearPickedFarmer() {
    setPickedFarmerName(null);
    setLoadedFarmer(null);
    setValues((current) => ({ ...current, farmer_id: "" }));
  }

  function openFarmerPicker() {
    setPickerOpen(true);
  }

  function validateStep(index: number) {
    if (index === 0) {
      if (!values.farmer_name?.trim()) {
        Alert.alert("Farmer name", "Enter the farmer's name to continue.");
        return false;
      }
      if (!values.district || !values.village) {
        Alert.alert("Village", "Choose district and village for this field visit.");
        return false;
      }
    }
    if (index === 1) {
      if (!values.crop) {
        Alert.alert("Crop", "Select the crop for this visit.");
        return false;
      }
      const hasIssue =
        Boolean(values.crop_health?.trim()) ||
        Boolean(values.weed_condition?.trim()) ||
        Boolean(values.pest_issue) ||
        Boolean(values.disease_issue);
      if (!hasIssue) {
        Alert.alert("What you saw", "Add crop health, weeds, or mark pest / disease.");
        return false;
      }
    }
    if (index === 2) {
      const hasAdvice =
        Boolean(values.field_notes?.trim()) ||
        Boolean(values.observation?.trim()) ||
        Boolean(values.problem_seen?.trim()) ||
        Boolean(values.action_taken?.trim()) ||
        Boolean(values.notes?.trim()) ||
        Boolean(values.general_advice?.trim()) ||
        Boolean(values.fertilizer_advice?.trim()) ||
        Boolean(values.pesticide_advice?.trim()) ||
        Boolean(values.irrigation_advice?.trim());
      if (!hasAdvice) {
        Alert.alert("Observation / Field Notes", "Add observation or field notes before submitting.");
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) {
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function mergeGpsRequired(valuesIn: VisitFormValues): Promise<VisitFormValues | null> {
    const result = await getForegroundLocation();
    if (!result.granted) {
      Alert.alert(
        "Location required",
        result.message || "Turn on location so we can save proof you were at the field. You can try again after enabling GPS."
      );
      return null;
    }
    const loc = toVisitLocation(result.location);
    if (!loc.latitude || !loc.longitude) {
      Alert.alert("Location required", "We could not read your position. Move to an open area and try again.");
      return null;
    }
    return { ...valuesIn, ...loc };
  }

  async function handleSubmit() {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      setStep(0);
      return;
    }
    setLoading(true);
    try {
      const withGps = await mergeGpsRequired(values);
      if (!withGps) {
        return;
      }
      await onSubmit(withGps);
    } catch (error) {
      Alert.alert("Unable to save visit", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (masterLoading) {
    return <ListSkeleton rows={3} />;
  }

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <View style={styles.wrap}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressStep}>
          Step {step + 1} of {STEPS.length}
        </Text>
        <Text style={styles.progressName}>{STEPS[step]}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {step === 0 ? (
        <FadeInView key="step-0">
        <AppCard elevated style={styles.stepCard}>
          <Text style={styles.formTitle}>New field visit</Text>
          <Text style={styles.formSubtitle}>At the plot now? Enter farmer details and continue.</Text>

          {pickedFarmerName ? (
            <View style={styles.pickedBanner}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.pickedText} numberOfLines={1}>
                {pickedFarmerName}
              </Text>
              <Pressable onPress={clearPickedFarmer} hitSlop={8} accessibilityRole="button">
                <Text style={styles.pickedChange}>Change</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={() => void openFarmerPicker()} style={styles.chooseExisting} accessibilityRole="button">
            <Ionicons name="people-outline" size={20} color={colors.primaryDark} />
            <Text style={styles.chooseExistingText}>Choose existing farmer</Text>
          </Pressable>

          {values.farmer_id && loadedFarmer ? (
            <View style={styles.farmerSummary}>
              <Text style={styles.farmerSummaryTitle}>Farmer on file</Text>
              <SummaryLine label="Name" value={values.farmer_name || "—"} />
              <SummaryLine label="Mobile" value={values.farmer_phone || "—"} />
              <SummaryLine label="Village" value={villageLabel} />
              <SummaryLine label="District" value={districtLabel} />
              <SummaryLine
                label="Crop"
                value={loadedFarmer.crop_name || loadedFarmer.list_crop_name || "—"}
              />
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            {!values.farmer_id ? (
              <>
                <AppInput label="Farmer name" value={values.farmer_name} onChangeText={(text) => setField("farmer_name", text)} placeholder="Full name" />
                <AppInput label="Phone" value={values.farmer_phone} onChangeText={(text) => setField("farmer_phone", text)} keyboardType="phone-pad" placeholder="Mobile number" />
              </>
            ) : null}
            <AppSelect label="District" value={values.district} options={districtOptions} placeholder="Choose district" onChange={handleDistrictChange} />
            <AppSelect label="Village" value={values.village} options={villageOptions} placeholder="Choose village" onChange={(text) => setField("village", text)} />
            <AppInput label="Field / land (optional)" value={values.land_name} onChangeText={(text) => setField("land_name", text)} placeholder="Plot nickname" />
            <AppInput label="Area (optional)" value={values.land_area} onChangeText={(text) => setField("land_area", text)} keyboardType="decimal-pad" placeholder="Acres or local unit" />
          </View>
        </AppCard>
        </FadeInView>
      ) : null}

      {step === 1 ? (
        <FadeInView key="step-1">
        <AppCard elevated style={styles.stepCard}>
          <Text style={styles.stepHeading}>Crop & issue</Text>
          <Text style={styles.stepHint}>What you observed in the field</Text>
          <View style={styles.fieldGroup}>
            <AppSelect label="Crop" value={values.crop} options={cropOptions} placeholder="Choose crop" onChange={(text) => setField("crop", text)} />
            <AppInput label="Crop health" value={values.crop_health || ""} onChangeText={(text) => setField("crop_health", text)} placeholder="Growth, stress, symptoms…" />
            <AppInput label="Weeds" value={values.weed_condition || ""} onChangeText={(text) => setField("weed_condition", text)} placeholder="Weed pressure or types" />
            <Toggle label="Pest issue" value={Boolean(values.pest_issue)} onChange={(v) => setField("pest_issue", v)} />
            <Toggle label="Disease issue" value={Boolean(values.disease_issue)} onChange={(v) => setField("disease_issue", v)} />
          </View>
        </AppCard>
        </FadeInView>
      ) : null}

      {step === 2 ? (
        <FadeInView key="step-2">
        <AppCard elevated style={styles.stepCard}>
          <Text style={styles.stepHeading}>Observation / Field Notes</Text>
          <Text style={styles.stepHint}>Location is saved automatically when you submit</Text>
          <View style={styles.fieldGroup}>
            <AppInput label="Observation / Field Notes" value={values.field_notes || values.observation || values.general_advice || ""} onChangeText={(text) => { setField("field_notes", text); setField("observation", text); }} multiline placeholder="What did you observe in the field?" />
            <AppInput label="Problem Seen" value={values.problem_seen || ""} onChangeText={(text) => setField("problem_seen", text)} multiline placeholder="Pest, disease, nutrient issue…" />
            <AppInput label="Action Taken" value={values.action_taken || ""} onChangeText={(text) => setField("action_taken", text)} multiline placeholder="Advice or treatment given" />
            <AppInput label="Follow-up Date (optional)" value={values.follow_up_date || values.next_visit_date || ""} onChangeText={(text) => { setField("follow_up_date", text); setField("next_visit_date", text); }} placeholder="YYYY-MM-DD" />
            <AppInput label="Field notes (legacy)" value={values.notes || ""} onChangeText={(text) => setField("notes", text)} multiline placeholder="Observations, reminders…" />
            <AppInput label="Fertilizer (optional)" value={values.fertilizer_advice || ""} onChangeText={(text) => setField("fertilizer_advice", text)} multiline />
            <AppInput label="Pesticide (optional)" value={values.pesticide_advice || ""} onChangeText={(text) => setField("pesticide_advice", text)} multiline />
            <Toggle label="Follow-up required" value={Boolean(values.follow_up_required)} onChange={(v) => setField("follow_up_required", v)} />
          </View>
          <View style={styles.reviewBox}>
            <Text style={styles.reviewTitle}>Summary</Text>
            <ReviewLine label="Farmer" value={`${values.farmer_name || "—"} · ${villageLabel}`} />
            <ReviewLine label="Crop" value={cropLabel} />
          </View>
        </AppCard>
        </FadeInView>
      ) : null}

      <View style={styles.navRow}>
        {step > 0 ? <AppButton title="Back" onPress={goBack} variant="secondary" style={styles.navBtn} /> : <View style={styles.navBtn} />}
        {step < STEPS.length - 1 ? (
          <AppButton title="Continue" onPress={goNext} style={styles.navBtnPrimary} />
        ) : (
          <AppButton title={submitTitle} onPress={handleSubmit} loading={loading} style={styles.navBtnPrimary} />
        )}
      </View>

      <ExistingFarmerPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={selectFarmer} />
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={[styles.toggleValue, value ? styles.toggleOn : styles.toggleOff]}>{value ? "Yes" : "No"}</Text>
    </Pressable>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewLine}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.lg,
    paddingBottom: space.xl
  },
  progressHeader: {
    gap: 2,
    marginBottom: space.sm
  },
  progressStep: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  progressName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 99,
    height: 6,
    marginBottom: space.md,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 99,
    height: "100%"
  },
  stepCard: {
    gap: 0,
    paddingVertical: space.lg + 4
  },
  formTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3
  },
  formSubtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: space.lg,
    marginTop: space.sm
  },
  stepHeading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  stepHint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: space.lg,
    marginTop: space.xs
  },
  pickedBanner: {
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2
  },
  pickedText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  pickedChange: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  chooseExisting: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.lg,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  chooseExistingText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  farmerSummary: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: space.lg,
    padding: space.md + 2
  },
  farmerSummaryTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4
  },
  summaryLine: {
    gap: 2
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  fieldGroup: {
    gap: space.md + 2
  },
  navRow: {
    flexDirection: "row",
    gap: space.md,
    marginTop: space.sm
  },
  navBtn: {
    flex: 1
  },
  navBtnPrimary: {
    flex: 1,
    minHeight: 52
  },
  reviewBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    marginTop: space.lg,
    padding: space.md + 2
  },
  reviewTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: space.sm
  },
  reviewLine: {
    marginBottom: 8
  },
  reviewLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  reviewValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2
  },
  toggle: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 14
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  toggleValue: {
    borderRadius: 999,
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  toggleOn: {
    backgroundColor: colors.successSoft,
    color: colors.success
  },
  toggleOff: {
    backgroundColor: colors.warningSoft,
    color: colors.warning
  }
});

function toOptions(options: MasterOption[]): SelectOption[] {
  return options.map((option) => ({
    label: getOptionLabel(option),
    value: String(option.id),
    helper: option.district_name
  }));
}
