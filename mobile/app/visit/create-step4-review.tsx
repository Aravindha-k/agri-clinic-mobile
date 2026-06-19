import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { uploadVisitAttachmentFile } from "../../../src/api/visitAttachments";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import { getForegroundLocation } from "../../../src/utils/location";
import { requestGpsForFieldWork } from "../../../src/utils/locationRequiredModal";
import { hasValidGps, hasVisitObservationOrAdvice } from "../../../src/visit/visitValidation";
import { FlatCard } from "../../components/layout/FlatCard";
import { LocationPreviewMap } from "../../../src/components/map/LocationPreviewMap";
import { PrimaryButton, StatusChip } from "../../components/ui";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { VisitFlowHeader } from "../../components/visit/VisitFlowHeader";
import { enqueuePendingVisit, generateLocalSyncId } from "../../lib/pendingVisitsQueue";
import { getVisitDutyFields } from "../../lib/visitDutyContext";
import {
  buildVisitFormValuesFromStore,
  isOfflineSubmitError,
  submitVisitFromStore
} from "../../lib/visitSubmitApi";
import { farmerDisplayName, useVisitFormStore } from "../../store/visitFormStore";
import { EntranceBlocks } from "../../components/ui/EntranceBlocks";
import { useVisitEntranceKey } from "../../context/VisitEntranceContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  onBack: () => void;
  onEditStep1: () => void;
  onEditStep2: () => void;
  onEditStep3: () => void;
};

function gpsStatusText(accuracy: number | null | undefined, t: (k: string, p?: Record<string, string | number>) => string) {
  if (accuracy == null || accuracy > 35) return t("visitFlow.gpsNotCaptured");
  return t("visitFlow.gpsCaptured", { meters: Math.round(accuracy) });
}

function gpsDotColor(accuracy: number | null | undefined) {
  if (accuracy == null || accuracy > 35) return Colors.amber;
  return Colors.green;
}

export function VisitCreateStep4({ onBack, onEditStep1, onEditStep2, onEditStep3 }: Props) {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const replayKey = useVisitEntranceKey();
  const online = useConnectivityOnline();
  const { bumpAfterVisitChange } = useFieldDataRefresh();
  const { isActive, startDay, busy: workdayBusy } = useTracking();
  const reset = useVisitFormStore((s) => s.reset);
  const setGpsCoords = useVisitFormStore((s) => s.setGpsCoords);

  const submitInFlightRef = useRef(false);
  const localSyncIdRef = useRef<string | null>(null);

  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const visitKind = useVisitFormStore((s) => s.visitKind);
  const cropName = useVisitFormStore((s) => s.cropName);
  const problemCategoryCode = useVisitFormStore((s) => s.problemCategoryCode);
  const selectedProblem = useVisitFormStore((s) => s.selectedProblem);
  const otherProblemDescription = useVisitFormStore((s) => s.otherProblemDescription);
  const gpsCoords = useVisitFormStore((s) => s.gpsCoords);
  const observation = useVisitFormStore((s) => s.observation);
  const recommendation = useVisitFormStore((s) => s.recommendation);
  const photos = useVisitFormStore((s) => s.photos);
  const extraAttachments = useVisitFormStore((s) => s.extraAttachments);

  const [submitting, setSubmitting] = useState(false);
  const [submitHint, setSubmitHint] = useState("");

  const isOtherProblem = problemCategoryCode === "other";
  const problemLabel = isOtherProblem
    ? otherProblemDescription.trim() || t("visitFlow.other")
    : selectedProblem?.tamil_name || selectedProblem?.name || problemCategoryCode || "—";

  const farmerName = farmerDisplayName(farmer, newFarmer);
  const farmerPhone = farmer?.phone?.trim() || newFarmer?.phone?.trim() || "—";
  const farmerVillage = farmer?.village_name?.trim() || t("visitFlow.villageNotSet");
  const visitTypeLabel = visitKind === "revisit" ? t("visitFlow.revisit") : t("visitFlow.firstVisit");
  const evidenceCount = photos.length + extraAttachments.length;

  function validateSubmit(): boolean {
    if (!hasVisitObservationOrAdvice(observation, recommendation)) {
      setSubmitHint(t("visitFlow.errObservationOrAdvice"));
      return false;
    }
    setSubmitHint("");
    return true;
  }

  async function uploadExtraAttachments(visitId: number) {
    const failed: string[] = [];
    for (const attachment of extraAttachments) {
      if (!attachment.uri) continue;
      try {
        await uploadVisitAttachmentFile(visitId, {
          uri: attachment.uri,
          name: attachment.name ?? "attachment",
          mimeType: attachment.mimeType ?? "application/octet-stream",
          attachmentType: attachment.attachmentType
        });
      } catch {
        failed.push(attachment.name ?? "attachment");
      }
    }
    return failed;
  }

  async function handleSubmit() {
    if (submitInFlightRef.current) return;
    if (!validateSubmit()) return;

    if (!isActive) {
      const started = await startDay();
      if (!started) {
        setSubmitHint(t("visitFlow.workdayFirstBody"));
        return;
      }
    }

    const allowed = await requestGpsForFieldWork();
    if (!allowed) return;

    submitInFlightRef.current = true;
    setSubmitting(true);
    setSubmitHint("");

    const localSyncId = localSyncIdRef.current ?? generateLocalSyncId();
    localSyncIdRef.current = localSyncId;

    let capturedExtras:
      | {
          latitude: number;
          longitude: number;
          accuracy: number | null;
          capturedAt: Date;
          duty: Awaited<ReturnType<typeof getVisitDutyFields>>;
        }
      | undefined;

    try {
      const locationResult = await getForegroundLocation();
      if (!locationResult.granted) {
        setSubmitHint(locationResult.message || t("visitFlow.gpsNotCaptured"));
        return;
      }

      const { latitude, longitude, accuracy } = locationResult.location.coords;
      setGpsCoords({ latitude, longitude, accuracy: accuracy ?? null });
      const capturedAt = new Date(locationResult.location.timestamp);
      const duty = await getVisitDutyFields();
      capturedExtras = {
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        capturedAt,
        duty
      };

      const state = useVisitFormStore.getState();
      const values = buildVisitFormValuesFromStore(state, localSyncId, capturedExtras);

      if (!hasValidGps(values)) {
        setSubmitHint(t("visitFlow.gpsNotCaptured"));
        return;
      }

      const gpsConfirmed = accuracy != null && Number.isFinite(accuracy) && accuracy <= 100;

      if (!online) {
        throw new Error("offline");
      }

      const { visit, evidenceFailed } = await submitVisitFromStore(state, localSyncId, capturedExtras);
      localSyncIdRef.current = null;
      const uploadFailures = [...evidenceFailed, ...(await uploadExtraAttachments(visit.id))];
      bumpAfterVisitChange();
      reset();
      navigation.navigate("VisitSuccess", {
        visitId: visit.id,
        queued: false,
        evidenceWarning: uploadFailures.length ? `Some uploads failed: ${uploadFailures.join(", ")}` : undefined,
        farmerId: values.farmer_id,
        farmerName: values.farmer_name,
        savedCrop: cropName,
        savedObservation: values.observation,
        savedProblemSeen: values.problem_seen,
        savedRecommendation: values.recommendation,
        savedActionTaken: values.action_taken,
        submittedAt: capturedAt.toISOString(),
        gpsConfirmed
      });
    } catch (err) {
      if (!isOfflineSubmitError(err) && (err as Error)?.message !== "offline") {
        setSubmitHint(err instanceof Error ? err.message : t("visitFlow.submitFailed"));
        return;
      }

      const state = useVisitFormStore.getState();
      const duty = capturedExtras?.duty ?? (await getVisitDutyFields());
      const values = buildVisitFormValuesFromStore(state, localSyncId, {
        ...capturedExtras,
        duty
      });

      await enqueuePendingVisit(
        {
          id: localSyncId,
          local_sync_id: localSyncId,
          createdAt: new Date().toISOString(),
          values,
          photos: state.photos
        },
        extraAttachments
      );
      localSyncIdRef.current = null;

      bumpAfterVisitChange();
      reset();
      navigation.navigate("VisitSuccess", {
        visitId: 0,
        queued: true,
        queueId: localSyncId,
        farmerId: values.farmer_id,
        farmerName: values.farmer_name,
        savedCrop: cropName,
        savedObservation: values.observation,
        savedProblemSeen: values.problem_seen,
        savedRecommendation: values.recommendation,
        savedActionTaken: values.action_taken,
        submittedAt: values.captured_at ?? new Date().toISOString(),
        gpsConfirmed: hasValidGps(values)
      });
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }

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
      >
        <EntranceBlocks replayKey={replayKey} startStep={0} listStyle variant="card">
        <FlatCard style={styles.reviewCard}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewLabel}>{t("visitFlow.farmerSummary")}</Text>
            <Pressable onPress={onEditStep1} hitSlop={8}>
              <Text style={styles.editLink}>{t("visitFlow.change")}</Text>
            </Pressable>
          </View>
          <Text style={styles.reviewTitle}>{farmerName}</Text>
          <Text style={styles.reviewMeta}>
            {farmerPhone} · {farmerVillage}
          </Text>
          <StatusChip label={visitTypeLabel} variant={visitKind === "revisit" ? "blue" : "gray"} />
        </FlatCard>

        <FlatCard style={styles.reviewCard}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewLabel}>{t("visitFlow.cropProblem")}</Text>
            <Pressable onPress={onEditStep2} hitSlop={8}>
              <Text style={styles.editLink}>{t("visitFlow.change")}</Text>
            </Pressable>
          </View>
          <View style={styles.chipRow}>
            {cropName ? <StatusChip label={cropName} variant="gray" /> : null}
            {problemCategoryCode ? <StatusChip label={problemCategoryCode} variant="blue" /> : null}
          </View>
          <Text style={styles.reviewValue}>{problemLabel}</Text>
        </FlatCard>

        <FlatCard style={styles.reviewCard}>
          <View style={styles.reviewHead}>
            <Text style={styles.reviewLabel}>{t("visitFlow.adviceSummary")}</Text>
            <Pressable onPress={onEditStep3} hitSlop={8}>
              <Text style={styles.editLink}>{t("visitFlow.change")}</Text>
            </Pressable>
          </View>
          <Text style={styles.reviewBlockLabel}>{t("visitFlow.observation")}</Text>
          <Text style={styles.reviewValue}>{observation.trim() || "—"}</Text>
          <Text style={styles.reviewBlockLabel}>{t("visitFlow.recommendation")}</Text>
          <Text style={styles.reviewValue}>{recommendation.trim() || "—"}</Text>
          <Text style={styles.reviewBlockLabel}>{t("visitFlow.evidencePhotos")}</Text>
          <Text style={styles.reviewValue}>
            {evidenceCount > 0
              ? t("visitFlow.evidenceCount", { count: evidenceCount })
              : t("visitFlow.noEvidence")}
          </Text>
        </FlatCard>

        <View style={styles.gpsRow}>
          <Text style={styles.reviewLabel}>{t("visitFlow.gpsSummary")}</Text>
          <View style={styles.gpsStatus}>
            <View style={[styles.gpsDot, { backgroundColor: gpsDotColor(gpsCoords?.accuracy) }]} />
            <Text style={styles.gpsText}>{gpsStatusText(gpsCoords?.accuracy, t)}</Text>
          </View>
        </View>

        <View style={styles.mapPreviewWrap}>
          <Text style={styles.reviewLabel}>Field location</Text>
          <LocationPreviewMap
            height={180}
            latitude={gpsCoords?.latitude ?? farmer?.latitude}
            longitude={gpsCoords?.longitude ?? farmer?.longitude}
            title={farmerName}
            description={farmerVillage}
            markerKind="visit"
            showLiveLocation
            emptyMessage={t("visitFlow.gpsNotCaptured")}
          />
        </View>
        </EntranceBlocks>
      </ScrollView>

      <View style={styles.footer}>
        {submitHint ? <Text style={styles.footerHint}>{submitHint}</Text> : null}
        <PrimaryButton
          label={online ? t("visitFlow.submitVisit") : t("visitFlow.saveOffline")}
          onPress={() => void handleSubmit()}
          loading={submitting || workdayBusy}
          disabled={submitting || workdayBusy}
          icon={
            <Ionicons
              name={online ? "send-outline" : "cloud-upload-outline"}
              size={18}
              color={Colors.surface}
            />
          }
          style={styles.footerBtn}
        />
      </View>
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
    paddingBottom: 130,
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
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase"
  },
  editLink: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
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
    gap: 6
  },
  gpsDot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  gpsText: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  mapPreviewWrap: {
    gap: 8,
    paddingVertical: 4
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
