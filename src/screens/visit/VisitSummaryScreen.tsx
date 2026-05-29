import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { submitMobileVisit } from "../../api/visits";
import { AppHeader, PremiumCard, PrimaryButton, VisitStepProgress } from "../../components/ui";
import { VisitFlowParamList } from "../../navigation/types";
import { useFieldDataRefresh } from "../../storage/FieldDataRefreshContext";
import { useOfflineSync } from "../../storage/OfflineSyncContext";
import { useTheme } from "../../theme";
import { isNetworkError } from "../../utils/network";
import { getForegroundLocation, toVisitLocation } from "../../utils/location";
import { uploadAllPendingAttachments } from "../../visit/pendingAttachments";
import { prepareVisitForSubmit } from "../../visit/prepareVisitSubmit";
import { uploadPendingFarmerPhotoIfNeeded } from "../../visit/uploadPendingFarmerPhoto";
import { useActiveWorkday } from "../../hooks/useActiveWorkday";
import { useGpsWorkGuard } from "../../hooks/useGpsWorkGuard";
import { useVisitFlow } from "../../visit/VisitFlowContext";
import { resolveFarmerPk } from "../../visit/resolveFarmerPk";
import { getSubmitIssues, getSubmitSummaryLines, hasValidGps, normalizeVisitGpsFields } from "../../visit/visitValidation";

type Props = NativeStackScreenProps<VisitFlowParamList, "VisitSummary">;

export function VisitSummaryScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { values, meta, reset, setValues, pendingAttachments, pendingFarmerPhoto } = useVisitFlow();
  const { enqueue } = useOfflineSync();
  const { bumpAfterVisitChange, bumpAfterFarmerPhotoChange } = useFieldDataRefresh();
  const { canRunWorkAction } = useGpsWorkGuard();
  const { requireActiveWorkday } = useActiveWorkday();
  const [submitting, setSubmitting] = useState(false);
  const [gpsCapturing, setGpsCapturing] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const lockRef = useRef(false);

  const gpsReady = hasValidGps(values);

  const captureGps = useCallback(async () => {
    if (!canRunWorkAction()) {
      return null;
    }
    setGpsCapturing(true);
    try {
      const result = await getForegroundLocation();
      if (!result.granted) {
        return null;
      }
      const loc = toVisitLocation(result.location);
      setValues((v) => ({ ...v, ...loc }));
      return loc;
    } finally {
      setGpsCapturing(false);
    }
  }, [canRunWorkAction, setValues]);

  async function handleSubmit() {
    if (lockRef.current || submitting) return;
    if (!canRunWorkAction() || !requireActiveWorkday()) return;
    lockRef.current = true;
    setSubmitting(true);
    setFormMessage("");

    try {
      let working = normalizeVisitGpsFields(values);

      if (!hasValidGps(working)) {
        const loc =
          (await captureGps()) ??
          (await getForegroundLocation().then((r) => (r.granted ? toVisitLocation(r.location) : null)));
        if (!loc) {
          setFormMessage("Turn on location permission to submit this visit.");
          return;
        }
        working = normalizeVisitGpsFields({ ...working, ...loc });
      }

      try {
        working = await prepareVisitForSubmit(working);
      } catch (err) {
        setFormMessage(err instanceof Error ? err.message : "Could not register farmer.");
        return;
      }
      setValues(working);

      try {
        await uploadPendingFarmerPhotoIfNeeded(working.farmer_id, pendingFarmerPhoto);
        if (pendingFarmerPhoto) {
          bumpAfterFarmerPhotoChange();
        }
      } catch (err) {
        setFormMessage(
          err instanceof Error ? err.message : "Visit not submitted — farmer photo upload failed."
        );
        return;
      }

      if (resolveFarmerPk(working as Record<string, unknown>) == null) {
        setFormMessage(
          "Farmer is not linked. On step 1, choose an existing farmer or enter name and mobile for a new farmer."
        );
        return;
      }

      const issues = getSubmitIssues(working);
      if (issues.length > 0) {
        setFormMessage(getSubmitSummaryLines(issues).join(" · "));
        return;
      }

      const attachmentSnapshot = [...pendingAttachments];

      try {
        const visit = await submitMobileVisit(working);
        let evidenceWarning: string | undefined;

        if (attachmentSnapshot.length > 0) {
          setFormMessage(`Uploading ${attachmentSnapshot.length} evidence item(s)…`);
          const uploadResult = await uploadAllPendingAttachments(visit.id, attachmentSnapshot);
          if (uploadResult.failed.length > 0) {
            evidenceWarning = `Visit saved, but ${uploadResult.failed.length} item(s) failed to upload: ${uploadResult.failed.join(", ")}`;
          }
        }

        bumpAfterVisitChange();
        reset();
        navigation.replace("VisitSuccess", { visitId: visit.id, queued: false, evidenceWarning });
      } catch (err) {
        if (isNetworkError(err)) {
          const item = await enqueue(working, attachmentSnapshot, pendingFarmerPhoto);
          reset();
          navigation.replace("VisitSuccess", { visitId: 0, queued: true, queueId: item.id });
        } else {
          setFormMessage(err instanceof Error ? err.message : "Unable to submit visit.");
        }
      }
    } finally {
      lockRef.current = false;
      setSubmitting(false);
    }
  }

  const cropDisplay = meta.cropLabel || values.crop || "—";

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader title="Review visit" subtitle="Confirm & submit" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <VisitStepProgress step={2} />

        {formMessage ? (
          <View style={[styles.message, { backgroundColor: c.dangerSoft, borderColor: c.danger }]}>
            <Text style={[styles.messageText, { color: c.danger }]}>{formMessage}</Text>
          </View>
        ) : null}

        <PremiumCard elevated tint="soft">
          <Text style={[styles.heroName, { color: c.text }]}>{meta.farmerDisplayName || values.farmer_name || "—"}</Text>
          <Text style={{ color: c.muted, fontSize: 14, marginTop: 4 }}>
            {[meta.villageLabel, meta.districtLabel].filter(Boolean).join(" · ") || "—"}
          </Text>
        </PremiumCard>

        <PremiumCard elevated>
          <SummaryRow label="Mobile" value={values.farmer_phone || "—"} />
          <SummaryRow
            label="Land"
            value={[values.land_name, values.land_area].filter(Boolean).join(" · ") || "—"}
          />
          <SummaryRow label="Crop" value={cropDisplay} />
          <SummaryRow label="Crop health" value={values.crop_health || "—"} />
          <SummaryRow label="Weeds" value={values.weed_condition || "—"} />
          <SummaryRow
            label="Pest / disease"
            value={[values.pest_issue ? "Pest" : "", values.disease_issue ? "Disease" : ""].filter(Boolean).join(", ") || "None"}
          />
          <SummaryRow label="Recommendation" value={values.general_advice || "—"} />
          {values.fertilizer_advice ? <SummaryRow label="Fertilizer" value={values.fertilizer_advice} /> : null}
          {values.pesticide_advice ? <SummaryRow label="Pesticide" value={values.pesticide_advice} /> : null}
          {values.irrigation_advice ? <SummaryRow label="Irrigation" value={values.irrigation_advice} /> : null}
          {values.notes ? <SummaryRow label="Notes" value={values.notes} /> : null}
          <SummaryRow label="Follow-up" value={values.follow_up_required ? "Yes" : "No"} />
          <SummaryRow
            label="Evidence"
            value={
              pendingAttachments.length === 0
                ? "None added"
                : `${pendingAttachments.length} item${pendingAttachments.length === 1 ? "" : "s"} ready to upload`
            }
          />
          <View style={styles.gpsRow}>
            <Ionicons name={gpsReady ? "location" : "location-outline"} size={18} color={gpsReady ? c.success : c.muted} />
            <Text style={{ color: gpsReady ? c.success : c.muted, flex: 1, fontSize: 13, fontWeight: "700" }}>
              {gpsCapturing
                ? "Capturing GPS…"
                : gpsReady
                  ? `GPS ${values.latitude}, ${values.longitude}`
                  : "GPS will be captured when you submit"}
            </Text>
            {!gpsReady ? (
              <Text onPress={() => void captureGps()} style={{ color: c.primaryDark, fontSize: 13, fontWeight: "800" }}>
                Retry
              </Text>
            ) : null}
          </View>
        </PremiumCard>

        <PrimaryButton title="Submit visit" onPress={() => void handleSubmit()} loading={submitting} disabled={submitting || gpsCapturing} />
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { gap: 14, padding: 16, paddingBottom: 40 },
  message: { borderRadius: 12, borderWidth: 1, padding: 12 },
  messageText: { fontSize: 13, fontWeight: "700", lineHeight: 20 },
  heroName: { fontSize: 20, fontWeight: "900" },
  row: { marginBottom: 14 },
  rowLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  rowValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  gpsRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 4 }
});
