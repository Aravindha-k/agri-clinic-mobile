import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { FlatCard } from "../../components/layout/FlatCard";
import { LocationPreviewMap } from "../../../src/components/map/LocationPreviewMap";
import { PrimaryButton, StatusChip } from "../../components/ui";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { VisitFlowHeader } from "../../components/visit/VisitFlowHeader";
import {
  VisitBottomFooter,
  VISIT_FOOTER_SCROLL_SPACE
} from "../../components/visit/VisitBottomFooter";
import {
  isVisitSubmitInFlight,
  submitVisitCoordinator,
  type VisitSubmitProgress
} from "../../lib/visit/visitSubmitCoordinator";
import {
  captureVisitGps,
  visitGpsIsUsable,
  type VisitGpsCaptureResult
} from "../../lib/visit/visitGpsCapture";
import { farmerDisplayName, useVisitFormStore } from "../../store/visitFormStore";
import { resolveVisitReviewFarmer } from "../../lib/visitReviewFarmer";
import { EntranceBlocks } from "../../components/ui/EntranceBlocks";
import { useVisitEntranceKey } from "../../context/VisitEntranceContext";
import { openDeviceLocationSettings } from "../../../src/utils/workdayLocationGate";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing, TextStyles, minTouchStyle } from "../../lib/theme";

type Props = {
  onBack: () => void;
  onEditStep1: () => void;
  onEditStep2: () => void;
  onEditStep3: () => void;
};

type GpsUiState = "capturing" | "ready" | "permission_missing" | "services_disabled" | "failed";

function progressHint(phase: VisitSubmitProgress, t: (k: string) => string): string {
  switch (phase) {
    case "ensuring_duty":
      return t("workdayUx.startingWorkday");
    case "capturing_location":
      return t("workdayUx.gettingLocation");
    case "submitting":
      return t("visitFlow.submitting");
    case "uploading_media":
      return t("visitFlow.uploadingEvidence");
    case "queueing":
      return t("visitFlow.savingOffline");
    default:
      return "";
  }
}

function formatCapturedAt(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function VisitCreateStep4({ onBack, onEditStep1, onEditStep2, onEditStep3 }: Props) {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const { districts, villages } = useMasterData();
  const replayKey = useVisitEntranceKey();
  const online = useConnectivityOnline();
  const { bumpAfterVisitChange } = useFieldDataRefresh();
  const { currentDuty, startDuty, refreshCurrentDuty, refreshDutyMap } = useDuty();

  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const visitKind = useVisitFormStore((s) => s.visitKind);
  const cropName = useVisitFormStore((s) => s.cropName);
  const problemCategoryCode = useVisitFormStore((s) => s.problemCategoryCode);
  const selectedProblem = useVisitFormStore((s) => s.selectedProblem);
  const otherProblemDescription = useVisitFormStore((s) => s.otherProblemDescription);
  const gpsCoords = useVisitFormStore((s) => s.gpsCoords);
  const visitedAt = useVisitFormStore((s) => s.visitedAt);
  const fieldNotes = useVisitFormStore((s) => s.fieldNotes);
  const photos = useVisitFormStore((s) => s.photos);
  const extraAttachments = useVisitFormStore((s) => s.extraAttachments);
  const setGpsCoords = useVisitFormStore((s) => s.setGpsCoords);
  const setVisitedAt = useVisitFormStore((s) => s.setVisitedAt);

  const [submitting, setSubmitting] = useState(false);
  const [submitHint, setSubmitHint] = useState("");
  const [gpsUi, setGpsUi] = useState<GpsUiState>(() =>
    visitGpsIsUsable(gpsCoords) ? "ready" : "capturing"
  );
  const [gpsMessage, setGpsMessage] = useState("");
  const [gpsSource, setGpsSource] = useState<"fresh" | "cached" | null>(null);
  const captureInFlight = useRef(false);

  const isOtherProblem = problemCategoryCode === "other";
  const problemLabel = isOtherProblem
    ? otherProblemDescription.trim() || t("visitFlow.other")
    : selectedProblem?.tamil_name || selectedProblem?.name || problemCategoryCode || "—";

  const farmerName = farmerDisplayName(farmer, newFarmer);
  const reviewFarmer = resolveVisitReviewFarmer(farmer, newFarmer, districts, villages, "—");
  const farmerPhone = reviewFarmer.phone;
  const farmerVillage = reviewFarmer.village;
  const visitTypeLabel = visitKind === "revisit" ? t("visitFlow.revisit") : t("visitFlow.firstVisit");
  const evidenceCount = photos.length + extraAttachments.length;
  const notesText = fieldNotes.trim();

  const applyGpsResult = useCallback(
    (result: VisitGpsCaptureResult) => {
      if (result.ok) {
        setGpsCoords({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy: result.coords.accuracy
        });
        setVisitedAt(result.coords.capturedAt);
        setGpsSource(result.coords.source);
        setGpsUi("ready");
        setGpsMessage("");
        // eslint-disable-next-line no-console
        console.log("[VisitGPS] review_location_ready", {
          accuracy: result.coords.accuracy,
          source: result.coords.source
        });
        return;
      }
      setGpsSource(null);
      if (result.reason === "permission_missing") setGpsUi("permission_missing");
      else if (result.reason === "services_disabled") setGpsUi("services_disabled");
      else setGpsUi("failed");
      setGpsMessage(result.message);
    },
    [setGpsCoords, setVisitedAt]
  );

  const runGpsCapture = useCallback(async () => {
    if (captureInFlight.current) return;
    captureInFlight.current = true;
    setGpsUi("capturing");
    setGpsMessage("");
    try {
      const result = await captureVisitGps({ requestPermission: false });
      applyGpsResult(result);
    } finally {
      captureInFlight.current = false;
    }
  }, [applyGpsResult]);

  const requestVisitLocationPermission = useCallback(async () => {
    const { enableLocationForFieldWork } = await import(
      "../../../src/features/fieldTrackingSetup/ensureForegroundLocation"
    );
    const { openSettingsForMissing } = await import("../../../src/features/fieldTrackingSetup");
    const enabled = await enableLocationForFieldWork();
    if (enabled.ok) {
      await runGpsCapture();
      return;
    }
    if (enabled.permanentlyDenied) {
      setGpsUi("permission_missing");
      setGpsMessage(enabled.message || "Location permission is disabled for Kavya Agri Clinic.");
      await openSettingsForMissing("foreground");
      return;
    }
    if (enabled.servicesDisabled) {
      setGpsUi("services_disabled");
      setGpsMessage(enabled.message || "Turn on phone location to record this visit.");
      return;
    }
    setGpsUi("permission_missing");
    setGpsMessage(enabled.message || "Location permission is required.");
  }, [runGpsCapture]);

  useEffect(() => {
    if (visitGpsIsUsable(gpsCoords)) {
      setGpsUi("ready");
      // eslint-disable-next-line no-console
      console.log("[VisitGPS] review_location_ready", { accuracy: gpsCoords?.accuracy, source: "store" });
      return;
    }
    void runGpsCapture();
  }, []);

  useEffect(() => {
    let lastRecheckAt = 0;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (gpsUi !== "permission_missing" && gpsUi !== "services_disabled" && gpsUi !== "failed") {
        return;
      }
      const now = Date.now();
      if (now - lastRecheckAt < 4_000) return;
      lastRecheckAt = now;
      // Recheck once after Settings return — never auto-open Settings.
      void runGpsCapture();
    });
    return () => sub.remove();
  }, [gpsUi, runGpsCapture]);

  async function handleSubmit() {
    if (submitting || isVisitSubmitInFlight()) return;
    if (gpsUi === "capturing") {
      setSubmitHint(t("visitFlow.gpsGettingLocation"));
      return;
    }
    if (!visitGpsIsUsable(useVisitFormStore.getState().gpsCoords)) {
      setSubmitHint(gpsMessage || t("visitFlow.gpsNotCaptured"));
      if (gpsUi === "ready") void runGpsCapture();
      return;
    }

    // eslint-disable-next-line no-console
    console.log("[VisitGPS] submit_location_validated", {
      accuracy: useVisitFormStore.getState().gpsCoords?.accuracy
    });

    setSubmitting(true);
    setSubmitHint("");

    try {
      const result = await submitVisitCoordinator({
        online,
        currentDuty,
        startDuty,
        refreshCurrentDuty,
        refreshDutyMap,
        bumpAfterVisitChange,
        t,
        onProgress: (next) => {
          const hint = progressHint(next, t);
          if (hint) setSubmitHint(hint);
        }
      });

      if (!result.ok) {
        if (!result.cancelled) setSubmitHint(result.message);
        return;
      }

      navigation.navigate("VisitSuccess", { summary: result.summary });
    } finally {
      setSubmitting(false);
    }
  }

  const gpsReady = gpsUi === "ready" && visitGpsIsUsable(gpsCoords);
  const submitDisabled = submitting || isVisitSubmitInFlight() || gpsUi === "capturing" || !gpsReady;

  return (
    <View style={styles.screen}>
      <VisitFlowHeader title={t("visitFlow.reviewAndSubmit")} subtitle={t("visitFlow.step4of4")} onBack={onBack} />

      <View style={styles.stepWrap}>
        <StepIndicator step={4} allComplete />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <EntranceBlocks replayKey={replayKey} startStep={0} listStyle variant="card">
        <FlatCard style={styles.reviewCard}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewLabel}>{t("visitFlow.farmerSummary")}</Text>
            <Pressable
              onPress={onEditStep1}
              accessibilityRole="button"
              accessibilityLabel={t("visitFlow.change")}
              style={styles.editChip}
            >
              <Ionicons name="create-outline" size={14} color={Colors.brand700} />
              <Text style={styles.editLink}>{t("visitFlow.change")}</Text>
            </Pressable>
          </View>
          <Text style={styles.reviewTitle}>{farmerName}</Text>
          <Text style={styles.reviewMeta}>
            {farmerPhone} · {farmerVillage} · {reviewFarmer.district}
          </Text>
          <StatusChip label={visitTypeLabel} variant={visitKind === "revisit" ? "blue" : "gray"} />
        </FlatCard>

        <FlatCard style={styles.reviewCard}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewLabel}>{t("visitFlow.cropProblem")}</Text>
            <Pressable
              onPress={onEditStep2}
              accessibilityRole="button"
              accessibilityLabel={t("visitFlow.change")}
              style={styles.editChip}
            >
              <Ionicons name="create-outline" size={14} color={Colors.brand700} />
              <Text style={styles.editLink}>{t("visitFlow.change")}</Text>
            </Pressable>
          </View>
          <View style={styles.chipRow}>
            {cropName ? <StatusChip label={cropName} variant="gray" /> : null}
            {problemLabel ? <StatusChip label={problemLabel} variant="blue" /> : null}
          </View>
        </FlatCard>

        <FlatCard style={styles.reviewCard}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewLabel}>{t("visitFlow.fieldNotes")}</Text>
            <Pressable
              onPress={onEditStep3}
              accessibilityRole="button"
              accessibilityLabel={t("visitFlow.change")}
              style={styles.editChip}
            >
              <Ionicons name="create-outline" size={14} color={Colors.brand700} />
              <Text style={styles.editLink}>{t("visitFlow.change")}</Text>
            </Pressable>
          </View>
          <Text style={styles.reviewValue}>
            {notesText || t("visitFlow.noFieldNotes")}
          </Text>
        </FlatCard>

        <FlatCard style={styles.reviewCard}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewLabel}>{t("visitFlow.evidenceOptional")}</Text>
            <Pressable
              onPress={onEditStep3}
              accessibilityRole="button"
              accessibilityLabel={t("visitFlow.change")}
              style={styles.editChip}
            >
              <Ionicons name="create-outline" size={14} color={Colors.brand700} />
              <Text style={styles.editLink}>{t("visitFlow.change")}</Text>
            </Pressable>
          </View>
          <Text style={styles.reviewValue}>
            {evidenceCount > 0
              ? t("visitFlow.evidenceCount", { count: evidenceCount })
              : t("visitFlow.noEvidence")}
          </Text>
        </FlatCard>

        <View style={styles.gpsRow}>
          <Text style={styles.reviewLabel}>{t("visitFlow.gpsSummary")}</Text>
          <View style={styles.gpsStatus}>
            <View
              style={[
                styles.gpsDot,
                {
                  backgroundColor:
                    gpsUi === "ready"
                      ? Colors.green
                      : gpsUi === "capturing"
                        ? Colors.amber
                        : Colors.red
                }
              ]}
            />
            <Text style={styles.gpsText}>
              {gpsUi === "capturing"
                ? t("visitFlow.gpsGettingLocation")
                : gpsUi === "ready" && gpsCoords
                  ? gpsCoords.accuracy != null
                    ? t("visitFlow.gpsCapturedDetail", {
                        meters: Math.round(gpsCoords.accuracy),
                        time: formatCapturedAt(visitedAt ?? undefined)
                      })
                    : t("visitFlow.gpsAutoFixed")
                  : gpsUi === "permission_missing"
                    ? t("visitFlow.gpsPermissionRequired")
                    : gpsUi === "services_disabled"
                      ? t("visitFlow.gpsTurnOnPhone")
                      : t("visitFlow.gpsCouldNotGet")}
            </Text>
          </View>
        </View>
        {gpsSource === "cached" && gpsUi === "ready" ? (
          <Text style={styles.gpsFixedHint}>{t("visitFlow.gpsRecentFixUsed")}</Text>
        ) : (
          <Text style={styles.gpsFixedHint}>{t("visitFlow.gpsAutoFixedHint")}</Text>
        )}

        <View style={styles.mapPreviewWrap}>
          <Text style={styles.reviewLabel}>{t("visitFlow.fieldLocation")}</Text>
          {gpsUi === "ready" && gpsCoords ? (
            <LocationPreviewMap
              height={180}
              latitude={gpsCoords.latitude}
              longitude={gpsCoords.longitude}
              title={farmerName}
              description={farmerVillage}
              markerKind="visit"
              showLiveLocation={false}
              interactive={false}
              emptyMessage={t("visitFlow.gpsNotCaptured")}
            />
          ) : (
            <View style={styles.gpsActionPanel}>
              <Text style={styles.gpsActionBody}>
                {gpsMessage ||
                  (gpsUi === "capturing"
                    ? t("visitFlow.gpsGettingLocation")
                    : t("visitFlow.gpsCouldNotGet"))}
              </Text>
              {gpsUi === "permission_missing" ? (
                <PrimaryButton
                  label={t("visitFlow.gpsFixLocationAccess")}
                  onPress={() => void requestVisitLocationPermission()}
                  style={styles.gpsActionBtn}
                />
              ) : null}
              {gpsUi === "services_disabled" ? (
                <PrimaryButton
                  label={t("visitFlow.gpsOpenLocationSettings")}
                  onPress={() => void openDeviceLocationSettings()}
                  style={styles.gpsActionBtn}
                />
              ) : null}
              {gpsUi === "failed" || gpsUi === "permission_missing" || gpsUi === "services_disabled" ? (
                <Pressable onPress={() => void runGpsCapture()} style={styles.retryLink}>
                  <Text style={styles.retryLinkText}>{t("visitFlow.gpsRetry")}</Text>
                </Pressable>
              ) : null}
              {gpsUi === "failed" ? (
                <Pressable onPress={onBack} style={styles.retryLink}>
                  <Text style={styles.retryLinkText}>{t("common.goBack")}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
        </EntranceBlocks>
      </ScrollView>

      <VisitBottomFooter hint={submitHint}>
        <PrimaryButton
          label={online ? t("visitFlow.submitVisit") : t("visitFlow.saveOffline")}
          onPress={() => void handleSubmit()}
          loading={submitting || gpsUi === "capturing"}
          disabled={submitDisabled}
          icon={
            <Ionicons
              name={online ? "send-outline" : "cloud-upload-outline"}
              size={18}
              color={Colors.surface}
            />
          }
          style={styles.footerBtn}
        />
      </VisitBottomFooter>
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
    paddingBottom: 12,
    paddingHorizontal: Spacing.screen
  },
  scroll: {
    gap: 10,
    paddingBottom: VISIT_FOOTER_SCROLL_SPACE,
    paddingHorizontal: Spacing.screen
  },
  reviewCard: {
    gap: 8,
    padding: Spacing.lg
  },
  reviewHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  reviewLabel: {
    ...TextStyles.label,
    color: Colors.text4,
    textTransform: "uppercase"
  },
  editChip: {
    ...minTouchStyle,
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand100,
    borderRadius: Radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minWidth: Layout.touchTargetMin,
    paddingHorizontal: Spacing.sm
  },
  editLink: {
    color: Colors.brand700,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold
  },
  reviewTitle: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  reviewMeta: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  reviewBlockLabel: {
    color: Colors.text4,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginTop: 4,
    textTransform: "uppercase"
  },
  reviewValue: {
    color: Colors.text1,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  gpsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4
  },
  gpsStatus: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 6,
    justifyContent: "flex-end",
    maxWidth: "70%"
  },
  gpsDot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  gpsText: {
    color: Colors.text3,
    flexShrink: 1,
    fontSize: FontSize.sm,
    textAlign: "right"
  },
  mapPreviewWrap: {
    gap: 8,
    paddingVertical: 4
  },
  gpsFixedHint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    lineHeight: 18
  },
  gpsActionPanel: {
    alignItems: "center",
    backgroundColor: Colors.surfaceMuted,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    minHeight: 160,
    justifyContent: "center",
    padding: Spacing.lg
  },
  gpsActionBody: {
    color: Colors.text2,
    fontSize: FontSize.md,
    lineHeight: 20,
    textAlign: "center"
  },
  gpsActionBtn: {
    width: "100%"
  },
  retryLink: {
    paddingVertical: 6
  },
  retryLinkText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  footerBtn: {
    width: "100%"
  }
});
