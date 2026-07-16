import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { getForegroundLocation } from "../../../src/utils/location";
import { buildSubmittedVisitSummary } from "../../../src/types/submittedVisitSummary";
import { requestGpsForFieldWork } from "../../../src/utils/locationRequiredModal";
import { hasValidGps } from "../../../src/visit/visitValidation";
import {
  pendingAttachmentLabel,
  uploadAllPendingAttachments,
  type PendingVisitAttachment
} from "../../../src/visit/pendingAttachments";
import { FlatCard } from "../../components/layout/FlatCard";
import { LocationPreviewMap } from "../../../src/components/map/LocationPreviewMap";
import { PrimaryButton, StatusChip } from "../../components/ui";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { VisitFlowHeader } from "../../components/visit/VisitFlowHeader";
import {
  VisitBottomFooter,
  VISIT_FOOTER_SCROLL_SPACE
} from "../../components/visit/VisitBottomFooter";
import { enqueuePendingVisit, generateLocalSyncId } from "../../lib/pendingVisitsQueue";
import { beginNewVisit } from "../../lib/beginNewVisit";
import { getVisitDutyFields } from "../../lib/visitDutyContext";
import {
  buildVisitFormValuesFromStore,
  isOfflineSubmitError,
  submitVisitFromStore
} from "../../lib/visitSubmitApi";
import { farmerDisplayName, useVisitFormStore } from "../../store/visitFormStore";
import { resolveVisitReviewFarmer } from "../../lib/visitReviewFarmer";
import { EntranceBlocks } from "../../components/ui/EntranceBlocks";
import { useVisitEntranceKey } from "../../context/VisitEntranceContext";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing, TextStyles, minTouchStyle } from "../../lib/theme";

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
  const { districts, villages } = useMasterData();
  const replayKey = useVisitEntranceKey();
  const online = useConnectivityOnline();
  const { bumpAfterVisitChange } = useFieldDataRefresh();
  const { busy: workdayBusy } = useTracking();
  const { currentDuty, startDuty, refreshCurrentDuty, refreshDutyMap } = useDuty();
  const setGpsCoords = useVisitFormStore((s) => s.setGpsCoords);

  const submitInFlightRef = useRef(false);

  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const visitKind = useVisitFormStore((s) => s.visitKind);
  const cropName = useVisitFormStore((s) => s.cropName);
  const problemCategoryCode = useVisitFormStore((s) => s.problemCategoryCode);
  const selectedProblem = useVisitFormStore((s) => s.selectedProblem);
  const otherProblemDescription = useVisitFormStore((s) => s.otherProblemDescription);
  const gpsCoords = useVisitFormStore((s) => s.gpsCoords);
  const fieldNotes = useVisitFormStore((s) => s.fieldNotes);
  const photos = useVisitFormStore((s) => s.photos);
  const extraAttachments = useVisitFormStore((s) => s.extraAttachments);
  const submissionLocalSyncId = useVisitFormStore((s) => s.submissionLocalSyncId);
  const setSubmissionLocalSyncId = useVisitFormStore((s) => s.setSubmissionLocalSyncId);

  const [submitting, setSubmitting] = useState(false);
  const [submitHint, setSubmitHint] = useState("");

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

  function validateSubmit(): boolean {
    setSubmitHint("");
    return true;
  }

  async function uploadExtraAttachments(visitId: number) {
    const failed: PendingVisitAttachment[] = [];
    for (const attachment of extraAttachments) {
      const result = await uploadAllPendingAttachments(visitId, [attachment]);
      if (result.failed.length) failed.push(attachment);
    }
    return failed;
  }

  async function handleSubmit() {
    if (submitInFlightRef.current) return;
    if (!validateSubmit()) return;

    submitInFlightRef.current = true;
    setSubmitting(true);
    setSubmitHint("");

    try {
      if (!currentDuty?.is_active) {
        const started = await startDuty();
        if (!started) {
          setSubmitHint(t("visitFlow.workdayFirstBody"));
          return;
        }
      }

      const allowed = await requestGpsForFieldWork();
      if (!allowed) return;

      const localSyncId = submissionLocalSyncId ?? generateLocalSyncId();
      setSubmissionLocalSyncId(localSyncId);

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
      const failedExtras = await uploadExtraAttachments(visit.id);
      const failedPhotoNames = new Set(evidenceFailed);
      const failedAttachments: PendingVisitAttachment[] = [
        ...state.photos
          .filter((photo) => failedPhotoNames.has(photo.name))
          .map((photo) => ({
            id: photo.id,
            attachmentType: "image" as const,
            uri: photo.uri,
            name: photo.name,
            mimeType: photo.mimeType,
            createdAt: new Date().toISOString()
          })),
        ...failedExtras
      ];
      const uploadFailures = failedAttachments.map(pendingAttachmentLabel);
      if (failedAttachments.length) {
        const { enqueueFailedVisitEvidence } = await import("../../lib/sync/pendingEvidenceQueue");
        await enqueueFailedVisitEvidence({
          visitId: visit.id,
          attachments: failedAttachments,
          localSyncId
        });
      }
      await Promise.all([
        refreshCurrentDuty().catch(() => undefined),
        refreshDutyMap().catch(() => undefined)
      ]);
      bumpAfterVisitChange();
      const summary = buildSubmittedVisitSummary({
        visitId: visit.id,
        queued: false,
        farmerName: values.farmer_name,
        cropName: cropName,
        problemText: values.problem_seen,
        observationText: values.observation,
        recommendationText: values.recommendation || values.action_taken,
        gpsConfirmed,
        submittedAt: capturedAt.toISOString(),
        evidenceWarning: uploadFailures.length
          ? t("visitFlow.uploadsQueuedForRetry", { files: uploadFailures.join(", ") })
          : undefined
      });
      beginNewVisit();
      navigation.navigate("VisitSuccess", { summary });
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
          photos: state.photos,
          status: "pending",
          attempts: 0
        },
        extraAttachments
      );

      bumpAfterVisitChange();
      const summary = buildSubmittedVisitSummary({
        visitId: 0,
        queued: true,
        queueId: localSyncId,
        farmerName: values.farmer_name,
        cropName: cropName,
        problemText: values.problem_seen,
        observationText: values.observation,
        recommendationText: values.recommendation || values.action_taken,
        gpsConfirmed: hasValidGps(values),
        submittedAt: values.captured_at ?? new Date().toISOString()
      });
      beginNewVisit();
      navigation.navigate("VisitSuccess", { summary });
      }
    } catch (err) {
      setSubmitHint(err instanceof Error ? err.message : t("visitFlow.submitFailed"));
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
            <Text style={styles.reviewLabel}>{t("visitFlow.adviceSummary")}</Text>
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
          <Text style={styles.reviewBlockLabel}>{t("visitFlow.fieldNotes")}</Text>
          <Text style={styles.reviewValue}>
            {fieldNotes.trim() || t("visitFlow.noObservationOptional")}
          </Text>
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
          <Text style={styles.reviewLabel}>{t("visitFlow.fieldLocation")}</Text>
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

      <VisitBottomFooter hint={submitHint}>
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
  footerBtn: {
    width: "100%"
  }
});
