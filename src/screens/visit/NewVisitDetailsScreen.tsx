import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getCrops, getOptionLabel, MasterOption } from "../../api/masters";
import { AppInput } from "../../components/AppInput";
import { AppSelect } from "../../components/AppSelect";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { VisitDraftEvidenceSection } from "../../components/visit/VisitDraftEvidenceSection";
import { extractPhotoUrl } from "../../utils/profilePhotoUrl";
import { AppHeader, PremiumCard, PrimaryButton, VisitStepProgress } from "../../components/ui";
import { VisitFlowParamList } from "../../navigation/types";
import { useTheme } from "../../theme";
import { getFarmer } from "../../api/farmers";
import { useGpsWorkGuard } from "../../hooks/useGpsWorkGuard";
import { useVisitFlow } from "../../visit/VisitFlowContext";
import { useResolveCropOnLoad } from "../../visit/useResolveCropOnLoad";
import { useSilentGps } from "../../visit/useSilentGps";
import {
  getDetailsStepIssues,
  hasValidGps,
  issuesToFieldErrors,
  normalizeVisitGpsFields,
  type VisitValidationField
} from "../../visit/visitValidation";

type Props = NativeStackScreenProps<VisitFlowParamList, "NewVisitDetails">;

const FIELD_ORDER: VisitValidationField[] = ["crop", "observation", "gps"];

export function NewVisitDetailsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { values, setValues, setMeta, meta, fieldErrors, setFieldErrors, clearFieldError, pendingFarmerPhoto } = useVisitFlow();
  useResolveCropOnLoad();
  const { canRunWorkAction } = useGpsWorkGuard();
  const { latitude, longitude, hasGps, capturing, error, capture } = useSilentGps({
    canCapture: canRunWorkAction
  });
  const [crops, setCrops] = useState<MasterOption[]>([]);
  const [farmerPhoto, setFarmerPhoto] = useState<string | null>(null);
  const [stepTouched, setStepTouched] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Partial<Record<VisitValidationField, number>>>({});

  useEffect(() => {
    getCrops()
      .then(setCrops)
      .catch(() => Alert.alert("Unable to load crops", "Please try again."));
  }, []);

  useEffect(() => {
    const id = values.farmer_id?.trim();
    if (!id || !/^\d+$/.test(id)) {
      setFarmerPhoto(null);
      return;
    }
    let cancelled = false;
    getFarmer(Number(id))
      .then((f) => {
        if (!cancelled) setFarmerPhoto(extractPhotoUrl(f));
      })
      .catch(() => {
        if (!cancelled) setFarmerPhoto(null);
      });
    return () => {
      cancelled = true;
    };
  }, [values.farmer_id]);

  const syncGpsToForm = useCallback(
    (lat?: string, lng?: string) => {
      if (!lat || !lng) return;
      setValues((v) => normalizeVisitGpsFields({ ...v, latitude: lat, longitude: lng }));
    },
    [setValues]
  );

  useFocusEffect(
    useCallback(() => {
      if (canRunWorkAction()) {
        void capture();
      }
    }, [canRunWorkAction, capture])
  );

  useEffect(() => {
    if (latitude && longitude) {
      syncGpsToForm(latitude, longitude);
    }
  }, [latitude, longitude, syncGpsToForm]);

  const cropOptions = useMemo(() => crops.map((crop) => ({ label: getOptionLabel(crop), value: String(crop.id) })), [crops]);
  const gpsReady = hasGps || hasValidGps(values);
  const gpsError = stepTouched ? fieldErrors.gps : undefined;

  function registerField(field: VisitValidationField) {
    return (event: { nativeEvent: { layout: { y: number } } }) => {
      fieldOffsets.current[field] = event.nativeEvent.layout.y;
    };
  }

  function scrollToFirstIssue(issues: ReturnType<typeof getDetailsStepIssues>) {
    const first = FIELD_ORDER.find((field) => issues.some((issue) => issue.field === field));
    if (!first) return;
    const y = fieldOffsets.current[first];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  }

  async function validateStep() {
    if (!canRunWorkAction()) return false;
    setStepTouched(true);
    if (!gpsReady) {
      if (!canRunWorkAction()) return false;
      await capture();
    }
    const merged = normalizeVisitGpsFields({
      ...values,
      latitude: values.latitude || latitude,
      longitude: values.longitude || longitude
    });
    const issues = getDetailsStepIssues(merged);
    if (issues.length === 0) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.crop;
        delete next.observation;
        delete next.gps;
        return next;
      });
      return merged;
    }
    setFieldErrors((current) => ({ ...current, ...issuesToFieldErrors(issues) }));
    scrollToFirstIssue(issues);
    return null;
  }

  async function goNext() {
    const merged = await validateStep();
    if (!merged) return;
    setValues(merged);
    setMeta((m) => ({
      ...m,
      cropLabel: cropOptions.find((o) => o.value === merged.crop)?.label
    }));
    navigation.navigate("VisitSummary");
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader title="New visit" subtitle="Field observations" onBack={() => navigation.goBack()} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <VisitStepProgress step={1} />
        {meta.farmerDisplayName ? (
          <PremiumCard elevated tint="soft">
            <View style={styles.farmerSummaryRow}>
              <ProfileAvatar name={meta.farmerDisplayName} photoUrl={farmerPhoto || pendingFarmerPhoto?.uri} size="md" />
              <View style={{ flex: 1 }}>
            <Text style={[styles.summaryLabel, { color: c.muted }]}>Farmer</Text>
            <Text style={[styles.summaryName, { color: c.text }]}>{meta.farmerDisplayName}</Text>
            {(meta.villageLabel || meta.districtLabel) && (
              <Text style={{ color: c.muted, fontSize: 13, marginTop: 4 }}>
                {[meta.villageLabel, meta.districtLabel].filter(Boolean).join(" · ")}
              </Text>
            )}
            {values.land_name || values.land_area ? (
              <Text style={{ color: c.muted, fontSize: 13, marginTop: 4 }}>
                {[values.land_name, values.land_area ? `${values.land_area} area` : ""].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
              </View>
            </View>
          </PremiumCard>
        ) : null}
        <View
          style={[
            styles.gpsBanner,
            {
              backgroundColor: gpsReady ? c.successSoft : c.cardMuted,
              borderColor: gpsError ? c.danger : c.border
            }
          ]}
        >
          <Ionicons name={gpsReady ? "location" : "location-outline"} size={20} color={gpsReady ? c.success : c.muted} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.gpsLabel, { color: c.text }]}>GPS location *</Text>
            <Text style={[styles.gpsText, { color: gpsReady ? c.success : c.muted }]}>
              {capturing ? "Capturing…" : gpsReady ? "Captured" : error || "Waiting for GPS"}
            </Text>
            {gpsError ? <Text style={[styles.fieldError, { color: c.danger }]}>{gpsError}</Text> : null}
          </View>
          {!gpsReady ? (
            <Pressable
              onPress={() => {
                if (canRunWorkAction()) void capture();
              }}
              style={[styles.gpsBtn, { backgroundColor: c.card }]}
            >
              <Text style={{ color: c.primaryDark, fontWeight: "800", fontSize: 12 }}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
        <PremiumCard elevated>
          <View onLayout={registerField("crop")}>
            <AppSelect
              label="Crop"
              required
              value={values.crop}
              options={cropOptions}
              error={fieldErrors.crop}
              onChange={(crop) => {
                setValues((v) => ({ ...v, crop }));
                clearFieldError("crop");
              }}
            />
          </View>
          <View onLayout={registerField("observation")}>
            <Text style={[styles.sectionLabel, { color: fieldErrors.observation ? c.danger : c.muted }]}>Field observations *</Text>
            {fieldErrors.observation ? <Text style={[styles.fieldError, { color: c.danger }]}>{fieldErrors.observation}</Text> : null}
          </View>
          <AppInput
            label="Crop health"
            value={values.crop_health || ""}
            onChangeText={(t) => {
              setValues((v) => ({ ...v, crop_health: t }));
              clearFieldError("observation");
            }}
            multiline
          />
          <AppInput
            label="Weeds"
            value={values.weed_condition || ""}
            onChangeText={(t) => {
              setValues((v) => ({ ...v, weed_condition: t }));
              clearFieldError("observation");
            }}
          />
          <ToggleRow label="Pest issue" value={Boolean(values.pest_issue)} onChange={(v) => { setValues((cur) => ({ ...cur, pest_issue: v })); clearFieldError("observation"); }} />
          <ToggleRow label="Disease issue" value={Boolean(values.disease_issue)} onChange={(v) => { setValues((cur) => ({ ...cur, disease_issue: v })); clearFieldError("observation"); }} />
          <AppInput
            label="Recommendation"
            value={values.general_advice || ""}
            onChangeText={(t) => {
              setValues((v) => ({ ...v, general_advice: t }));
              clearFieldError("observation");
            }}
            multiline
          />
          <AppInput
            label="Fertilizer advice"
            value={values.fertilizer_advice || ""}
            onChangeText={(t) => setValues((v) => ({ ...v, fertilizer_advice: t }))}
            multiline
          />
          <AppInput
            label="Pesticide advice"
            value={values.pesticide_advice || ""}
            onChangeText={(t) => setValues((v) => ({ ...v, pesticide_advice: t }))}
            multiline
          />
          <AppInput
            label="Irrigation advice"
            value={values.irrigation_advice || ""}
            onChangeText={(t) => setValues((v) => ({ ...v, irrigation_advice: t }))}
            multiline
          />
          <AppInput label="Notes" value={values.notes || ""} onChangeText={(t) => { setValues((v) => ({ ...v, notes: t })); clearFieldError("observation"); }} multiline />
          <ToggleRow
            label="Follow-up required"
            value={Boolean(values.follow_up_required)}
            onChange={(v) => setValues((cur) => ({ ...cur, follow_up_required: v }))}
          />
        </PremiumCard>
        <VisitDraftEvidenceSection />
        <PrimaryButton title="Review & submit" onPress={() => void goNext()} disabled={capturing} />
      </ScrollView>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={() => onChange(!value)} style={[styles.toggle, { backgroundColor: value ? c.primarySoft : c.cardMuted }]}>
      <Text style={{ color: c.text, fontWeight: "800", flex: 1 }}>{label}</Text>
      <Text style={{ color: value ? c.primaryDark : c.muted, fontWeight: "900" }}>{value ? "Yes" : "No"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { gap: 14, padding: 16, paddingBottom: 40 },
  summaryLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  summaryName: { fontSize: 18, fontWeight: "900", marginTop: 4 },
  farmerSummaryRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  gpsBanner: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 },
  gpsLabel: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  gpsText: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  fieldError: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  gpsBtn: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, marginBottom: 8, marginTop: 4, textTransform: "uppercase" },
  toggle: { alignItems: "center", borderRadius: 12, flexDirection: "row", marginVertical: 6, paddingHorizontal: 14, paddingVertical: 12 }
});
