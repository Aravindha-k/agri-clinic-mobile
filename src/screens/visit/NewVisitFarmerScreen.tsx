import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Farmer, getFarmer, getFarmersForFieldWorker } from "../../api/farmers";
import { getDistricts, getOptionLabel, getVillages, MasterOption } from "../../api/masters";
import { AppInput } from "../../components/AppInput";
import { AppSelect } from "../../components/AppSelect";
import { FarmerPhotoPicker } from "../../components/FarmerPhotoPicker";
import { ExistingFarmerPickerModal } from "../../components/ExistingFarmerPickerModal";
import { AppHeader, PremiumCard, PrimaryButton, SkeletonCard, VisitStepProgress } from "../../components/ui";
import { VisitFlowParamList } from "../../navigation/types";
import { useTheme } from "../../theme";
import { asArray } from "../../utils/format";
import { loadRevisitPrefill } from "../../utils/farmerPrefill";
import { useGpsWorkGuard } from "../../hooks/useGpsWorkGuard";
import { useFieldDataRefresh } from "../../storage/FieldDataRefreshContext";
import { useVisitFlow } from "../../visit/VisitFlowContext";
import { getFarmerStepIssues, issuesToFieldErrors, type VisitValidationField } from "../../visit/visitValidation";

type Props = NativeStackScreenProps<VisitFlowParamList, "NewVisitFarmer">;

const FIELD_ORDER: VisitValidationField[] = ["farmer", "district", "village"];

export function NewVisitFarmerScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const {
    values,
    setValues,
    applyPrefill,
    beginVisit,
    setMeta,
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    pendingFarmerPhoto,
    setPendingFarmerPhoto,
    clearPendingFarmerPhoto
  } = useVisitFlow();
  const { bumpAfterFarmerPhotoChange } = useFieldDataRefresh();
  const { canRunWorkAction } = useGpsWorkGuard();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [districts, setDistricts] = useState<MasterOption[]>([]);
  const [villages, setVillages] = useState<MasterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [enrichingFarmer, setEnrichingFarmer] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Partial<Record<VisitValidationField, number>>>({});
  const appliedPrefillKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [farmerData, districtData, villageData] = await Promise.all([
        getFarmersForFieldWorker(),
        getDistricts(),
        getVillages()
      ]);
      setFarmers(asArray(farmerData));
      setDistricts(districtData);
      setVillages(villageData);
    } catch (err) {
      Alert.alert("Unable to load", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!route.params?.fresh) return;
      beginVisit();
      appliedPrefillKey.current = null;
      navigation.setParams({ fresh: undefined, prefill: undefined });
    }, [route.params?.fresh, beginVisit, navigation])
  );

  const districtOptions = districts.map((d) => ({ label: getOptionLabel(d), value: String(d.id) }));
  const villageOptions = villages
    .filter((v) => !values.district || String(v.district) === values.district)
    .map((v) => ({ label: getOptionLabel(v), value: String(v.id) }));

  function registerField(field: VisitValidationField) {
    return (event: { nativeEvent: { layout: { y: number } } }) => {
      fieldOffsets.current[field] = event.nativeEvent.layout.y;
    };
  }

  function scrollToFirstIssue(issues: ReturnType<typeof getFarmerStepIssues>) {
    const first = FIELD_ORDER.find((field) => issues.some((issue) => issue.field === field));
    if (!first) return;
    const y = fieldOffsets.current[first];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  }

  const applyFarmerSelection = useCallback(
    async (farmer: Farmer) => {
      if (!districts.length || !villages.length) {
        Alert.alert("Still loading", "Please wait a moment and try again.");
        return;
      }
      setEnrichingFarmer(true);
      try {
        const { values: prefill, meta, farmer: full } = await loadRevisitPrefill(farmer, { districts, villages });
        applyPrefill(prefill, meta);
        setSelectedFarmer(full);
        clearPendingFarmerPhoto();
        clearFieldError("farmer");
        clearFieldError("district");
        clearFieldError("village");
        clearFieldError("crop");
        clearFieldError("observation");
      } catch (err) {
        Alert.alert(
          "Could not load farmer",
          err instanceof Error ? err.message : "Please try again."
        );
      } finally {
        setEnrichingFarmer(false);
      }
    },
    [districts, villages, applyPrefill, clearFieldError, clearPendingFarmerPhoto]
  );

  useEffect(() => {
    const prefill = route.params?.prefill;
    if (!prefill) return;
    const key = JSON.stringify(prefill);
    if (appliedPrefillKey.current === key) return;
    appliedPrefillKey.current = key;
    beginVisit(undefined);
    const id = prefill.farmer_id?.trim();
    if (id && /^\d+$/.test(id) && districts.length && villages.length) {
      void getFarmer(Number(id)).then((farmer) => applyFarmerSelection(farmer));
    }
  }, [route.params?.prefill, beginVisit, applyFarmerSelection, districts.length, villages.length]);

  function validateStep() {
    const issues = getFarmerStepIssues(values);
    if (issues.length === 0) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.farmer;
        delete next.district;
        delete next.village;
        return next;
      });
      return true;
    }
    setFieldErrors((current) => ({ ...current, ...issuesToFieldErrors(issues) }));
    scrollToFirstIssue(issues);
    return false;
  }

  function goNext() {
    if (!canRunWorkAction()) return;
    if (!validateStep()) return;
    const displayName = values.farmer_name?.trim() || values.farmer_phone || "Farmer";
    setMeta((m) => ({
      ...m,
      farmerDisplayName: displayName,
      districtLabel: districtOptions.find((o) => o.value === values.district)?.label,
      villageLabel: villageOptions.find((o) => o.value === values.village)?.label
    }));
    navigation.navigate("NewVisitDetails");
  }

  const linkedFarmer = Boolean(values.farmer_id);
  const showNewFarmerFields = !linkedFarmer;

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader title="New visit" subtitle="Farmer & location" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.pad}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <VisitStepProgress step={0} />
          <PremiumCard elevated tint="soft">
            <FarmerPhotoPicker
              farmer={linkedFarmer ? selectedFarmer : null}
              farmerName={values.farmer_name}
              pendingPhoto={pendingFarmerPhoto}
              onPendingPhotoChange={setPendingFarmerPhoto}
              onFarmerUpdated={(updated) => {
                setSelectedFarmer(updated);
                bumpAfterFarmerPhotoChange();
              }}
              compact
            />
          </PremiumCard>
          <PremiumCard elevated>
            <Text style={[styles.help, { color: c.muted }]}>
              Choose someone already in the directory, or enter details to register a new farmer before the visit is saved.
            </Text>

            <View onLayout={registerField("farmer")}>
              <PrimaryButton title="Choose existing farmer" onPress={() => setPickerOpen(true)} style={styles.mb} />
              {linkedFarmer ? (
                <View style={[styles.selected, { backgroundColor: c.primarySoft, borderColor: c.border }]}>
                  <Text style={[styles.badge, { color: c.primaryDark }]}>Existing farmer</Text>
                  <Text style={[styles.selectedName, { color: c.primaryDark }]}>{values.farmer_name}</Text>
                  <Text style={{ color: c.muted }}>{values.farmer_phone || "No phone"}</Text>
                  {enrichingFarmer ? (
                    <Text style={{ color: c.muted, fontSize: 12, marginTop: 6 }}>Loading profile & last visit…</Text>
                  ) : null}
                  <Pressable onPress={() => setPickerOpen(true)} disabled={enrichingFarmer}>
                    <Text style={{ color: c.primaryDark, fontWeight: "800", marginTop: 8 }}>Change farmer</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={[styles.orLabel, { color: c.muted }]}>Or new farmer</Text>
                  <AppInput
                    label="Farmer name"
                    required
                    value={values.farmer_name}
                    error={fieldErrors.farmer}
                    onChangeText={(text) => {
                      setValues((v) => ({ ...v, farmer_name: text, farmer_id: "" }));
                      setSelectedFarmer(null);
                      clearPendingFarmerPhoto();
                      clearFieldError("farmer");
                    }}
                    placeholder="Full name"
                  />
                  <AppInput
                    label="Mobile"
                    required
                    value={values.farmer_phone}
                    keyboardType="phone-pad"
                    onChangeText={(text) => {
                      setValues((v) => ({ ...v, farmer_phone: text, farmer_id: "" }));
                      setSelectedFarmer(null);
                      clearPendingFarmerPhoto();
                      clearFieldError("farmer");
                    }}
                    placeholder="10-digit mobile number"
                  />
                </>
              )}
            </View>

            <View onLayout={registerField("district")}>
              <AppSelect
                label="District"
                required
                value={values.district}
                options={districtOptions}
                error={fieldErrors.district}
                onChange={(d) => {
                  setValues((v) => ({ ...v, district: d, village: "" }));
                  clearFieldError("district");
                  clearFieldError("village");
                }}
              />
            </View>
            <View onLayout={registerField("village")}>
              <AppSelect
                label="Village"
                required
                value={values.village}
                options={villageOptions}
                error={fieldErrors.village}
                onChange={(v) => {
                  setValues((cur) => ({ ...cur, village: v }));
                  clearFieldError("village");
                }}
              />
            </View>
            <AppInput
              label="Field / land"
              value={values.land_name || ""}
              onChangeText={(text) => setValues((cur) => ({ ...cur, land_name: text }))}
              placeholder="Plot name (optional)"
            />
            <AppInput
              label="Land area"
              value={values.land_area || ""}
              onChangeText={(text) => setValues((cur) => ({ ...cur, land_area: text }))}
              keyboardType="decimal-pad"
              placeholder="Acres or local unit (optional)"
            />
          </PremiumCard>
          <PrimaryButton title="Continue" onPress={goNext} disabled={enrichingFarmer} loading={enrichingFarmer} />
        </ScrollView>
      )}
      <ExistingFarmerPickerModal
        visible={pickerOpen}
        farmers={farmers}
        onClose={() => setPickerOpen(false)}
        onSelect={(farmer) => void applyFarmerSelection(farmer)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { gap: 14, padding: 16, paddingBottom: 36 },
  help: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  mb: { marginBottom: 12 },
  orLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, marginBottom: 10, textTransform: "uppercase" },
  selected: { borderRadius: 14, borderWidth: 1, marginBottom: 8, padding: 14 },
  badge: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" },
  selectedName: { fontSize: 17, fontWeight: "900" }
});
