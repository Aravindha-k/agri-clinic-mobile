import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useI18n } from "../../../src/i18n/I18nContext";
import { uploadVisitAttachmentFile } from "../../../src/api/visitAttachments";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import type { PendingVisitAttachment } from "../../../src/visit/pendingAttachments";
import {
  finishVoiceRecording,
  pickPendingDocument,
  startVoiceRecording
} from "../../../src/visit/visitEvidencePickers";
import { PrimaryButton, StatusChip } from "../../components/ui";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { VisitFarmerSummaryCard } from "../../components/visit/VisitFarmerSummaryCard";
import { VisitRevisitContextCard } from "../../components/visit/VisitRevisitContextCard";
import { enqueuePendingVisit, generateLocalSyncId } from "../../lib/pendingVisitsQueue";
import { pickVisitPhotoFromCamera, pickVisitPhotoFromGallery } from "../../lib/visitPhotos";
import {
  buildVisitFormValuesFromStore,
  isOfflineSubmitError,
  submitVisitFromStore
} from "../../lib/visitSubmitApi";
import { useVisitFormStore } from "../../store/visitFormStore";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

const MAX_PHOTOS = 5;

type Props = {
  onBack: () => void;
  onEditStep2: () => void;
};

function gpsStatusText(accuracy: number | null | undefined, t: (k: string, p?: Record<string, string | number>) => string) {
  if (accuracy == null) return t("visitFlow.gpsWeak");
  return t("visitFlow.gpsCaptured", { meters: Math.round(accuracy) });
}

function gpsDotColor(accuracy: number | null | undefined) {
  if (accuracy == null || accuracy > 35) return Colors.amber;
  return Colors.green;
}

function attachmentIcon(type: PendingVisitAttachment["attachmentType"]) {
  if (type === "audio") return "mic-outline";
  if (type === "pdf" || type === "other") return "document-outline";
  return "attach-outline";
}

export function VisitCreateStep3({ onBack, onEditStep2 }: Props) {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const online = useConnectivityOnline();
  const { bumpAfterVisitChange } = useFieldDataRefresh();
  const reset = useVisitFormStore((s) => s.reset);

  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const cropName = useVisitFormStore((s) => s.cropName);
  const problemCategoryCode = useVisitFormStore((s) => s.problemCategoryCode);
  const selectedProblem = useVisitFormStore((s) => s.selectedProblem);
  const otherProblemDescription = useVisitFormStore((s) => s.otherProblemDescription);
  const gpsCoords = useVisitFormStore((s) => s.gpsCoords);
  const fieldNotes = useVisitFormStore((s) => s.fieldNotes);
  const observation = useVisitFormStore((s) => s.observation);
  const recommendation = useVisitFormStore((s) => s.recommendation);
  const revisitContext = useVisitFormStore((s) => s.revisitContext);
  const photos = useVisitFormStore((s) => s.photos);

  const setFieldNotes = useVisitFormStore((s) => s.setFieldNotes);
  const setObservation = useVisitFormStore((s) => s.setObservation);
  const setCombinedAdvice = useVisitFormStore((s) => s.setCombinedAdvice);
  const addPhoto = useVisitFormStore((s) => s.addPhoto);
  const removePhoto = useVisitFormStore((s) => s.removePhoto);

  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [extraAttachments, setExtraAttachments] = useState<PendingVisitAttachment[]>([]);
  const [submitHint, setSubmitHint] = useState("");

  const isOtherProblem = problemCategoryCode === "other";
  const problemTamil = isOtherProblem
    ? otherProblemDescription.trim()
    : selectedProblem?.tamil_name || selectedProblem?.name || t("visitFlow.problem");
  const problemEnglish = isOtherProblem
    ? t("visitFlow.other")
    : selectedProblem?.name || problemCategoryCode || t("visitFlow.categoryFallback");

  useEffect(() => {
    return () => {
      void recording?.stopAndUnloadAsync().catch(() => undefined);
    };
  }, [recording]);

  function validateSubmit(): boolean {
    if (!recommendation.trim()) {
      setSubmitHint(t("visitFlow.errRecommendation"));
      return false;
    }
    if (!observation.trim()) {
      setSubmitHint(t("visitFlow.errObservation"));
      return false;
    }
    setSubmitHint("");
    return true;
  }

  async function toggleVoice() {
    if (recording) {
      const item = await finishVoiceRecording(recording);
      setRecording(null);
      if (item) setExtraAttachments((prev) => [...prev, item]);
      return;
    }
    const rec = await startVoiceRecording();
    if (rec) setRecording(rec);
  }

  async function handleAddCameraPhoto() {
    if (photos.length >= MAX_PHOTOS) {
      setSubmitHint(`Photo limit reached (${MAX_PHOTOS}).`);
      return;
    }
    const photo = await pickVisitPhotoFromCamera();
    if (photo) addPhoto(photo);
  }

  async function handleAddGalleryPhoto() {
    if (photos.length >= MAX_PHOTOS) {
      setSubmitHint(`Photo limit reached (${MAX_PHOTOS}).`);
      return;
    }
    const photo = await pickVisitPhotoFromGallery();
    if (photo) addPhoto(photo);
  }

  async function handleAddFile() {
    const file = await pickPendingDocument();
    if (file) setExtraAttachments((prev) => [...prev, file]);
  }

  function removeExtraAttachment(id: string) {
    setExtraAttachments((prev) => prev.filter((a) => a.id !== id));
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
    if (!validateSubmit()) return;

    const localSyncId = generateLocalSyncId();
    const state = useVisitFormStore.getState();
    const values = buildVisitFormValuesFromStore(state, localSyncId);
    const gpsConfirmed =
      state.gpsCoords != null &&
      state.gpsCoords.accuracy != null &&
      state.gpsCoords.accuracy <= 35;
    setSubmitting(true);

    try {
      if (!online) {
        throw new Error("offline");
      }
      const { visit, evidenceFailed } = await submitVisitFromStore(state, localSyncId);
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
        submittedAt: new Date().toISOString(),
        gpsConfirmed
      });
    } catch (err) {
      if (!isOfflineSubmitError(err) && (err as Error)?.message !== "offline") {
        setSubmitHint(err instanceof Error ? err.message : t("visitFlow.submitFailed"));
        setSubmitting(false);
        return;
      }

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
        submittedAt: new Date().toISOString(),
        gpsConfirmed
      });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !submitting;
  const footerHint = submitHint;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={18} color={Colors.text1} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{t("visitFlow.evidenceSubmit")}</Text>
          <Text style={styles.headerSub}>{t("visitFlow.step3of3")}</Text>
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
        <StepIndicator step={3} allComplete />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onEditStep2} style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <Text style={styles.sectionLabel}>{t("visitFlow.cropProblem")}</Text>
            <Text style={styles.editLink}>{t("visitFlow.change")}</Text>
          </View>
          <View style={styles.summaryChips}>
            {cropName ? <StatusChip label={cropName} variant="gray" /> : null}
            {problemCategoryCode ? <StatusChip label={problemCategoryCode} variant="blue" /> : null}
          </View>
          <Text style={styles.summaryTamil}>{problemTamil}</Text>
          <Text style={styles.summaryEnglish}>{problemEnglish}</Text>
        </Pressable>

        {revisitContext ? <VisitRevisitContextCard context={revisitContext} /> : null}

        <Text style={styles.sectionLabel}>{t("visitFlow.recommendation")}</Text>
        <View style={styles.notesWrap}>
          <TextInput
            value={recommendation}
            onChangeText={setCombinedAdvice}
            placeholder={t("visitFlow.recommendationPlaceholder")}
            placeholderTextColor={Colors.text4}
            multiline
            style={styles.notesInput}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.sectionLabel}>{t("visitFlow.observation")}</Text>
        <View style={styles.notesWrap}>
          <TextInput
            value={observation}
            onChangeText={setObservation}
            placeholder={t("visitFlow.observationPlaceholder")}
            placeholderTextColor={Colors.text4}
            multiline
            style={styles.notesInput}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.sectionLabel}>{t("visitFlow.fieldNotes")}</Text>
        <View style={styles.notesWrap}>
          <TextInput
            value={fieldNotes}
            onChangeText={setFieldNotes}
            placeholder={t("visitFlow.fieldNotesPlaceholder")}
            placeholderTextColor={Colors.text4}
            multiline
            style={styles.notesInput}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.evidenceHead}>
          <Text style={styles.sectionLabel}>{t("visitFlow.evidencePhotos")}</Text>
          <View style={styles.countChip}>
            <Text style={styles.countChipText}>
              {photos.length + extraAttachments.length}/{MAX_PHOTOS + 5}
            </Text>
          </View>
        </View>

        <View style={styles.mediaActions}>
          <Pressable onPress={() => void handleAddCameraPhoto()} style={styles.mediaBtn}>
            <Ionicons name="camera-outline" size={22} color={Colors.brand700} />
            <Text style={styles.mediaBtnText}>{t("visitFlow.takePhoto")}</Text>
          </Pressable>
          <Pressable onPress={() => void handleAddGalleryPhoto()} style={styles.mediaBtn}>
            <Ionicons name="images-outline" size={22} color={Colors.brand700} />
            <Text style={styles.mediaBtnText}>{t("visitFlow.gallery")}</Text>
          </Pressable>
          <Pressable
            onPress={() => void toggleVoice()}
            style={[styles.mediaBtn, recording && styles.mediaBtnActive]}
          >
            <Ionicons name="mic-outline" size={22} color={recording ? Colors.surface : Colors.brand700} />
            <Text style={[styles.mediaBtnText, recording && styles.mediaBtnTextActive]}>
              {recording ? t("visitFlow.stop") : t("visitFlow.recordAudio")}
            </Text>
          </Pressable>
          <Pressable onPress={() => void handleAddFile()} style={styles.mediaBtn}>
            <Ionicons name="document-outline" size={22} color={Colors.brand700} />
            <Text style={styles.mediaBtnText}>{t("visitFlow.addFile")}</Text>
          </Pressable>
        </View>

        <View style={styles.attachmentList}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.attachmentCard}>
              <Image source={{ uri: photo.uri }} style={styles.attachmentThumb} />
              <View style={styles.attachmentCopy}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {photo.name}
                </Text>
                <Text style={styles.attachmentType}>{t("visitFlow.photo")}</Text>
              </View>
              <Pressable onPress={() => removePhoto(photo.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={Colors.red} />
              </Pressable>
            </View>
          ))}
          {extraAttachments.map((attachment) => (
            <View key={attachment.id} style={styles.attachmentCard}>
              <View style={styles.attachmentIconWrap}>
                <Ionicons name={attachmentIcon(attachment.attachmentType)} size={22} color={Colors.brand700} />
              </View>
              <View style={styles.attachmentCopy}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.name ?? attachment.attachmentType}
                </Text>
                <Text style={styles.attachmentType}>{attachment.attachmentType}</Text>
              </View>
              <Pressable onPress={() => removeExtraAttachment(attachment.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={Colors.red} />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.gpsRow}>
          <View style={[styles.gpsDot, { backgroundColor: gpsDotColor(gpsCoords?.accuracy) }]} />
          <Text style={styles.gpsText}>{gpsStatusText(gpsCoords?.accuracy, t)}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {footerHint ? <Text style={styles.footerHint}>{footerHint}</Text> : null}
        <PrimaryButton
          label={online ? t("visitFlow.submitVisit") : t("visitFlow.saveOffline")}
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={!canSubmit}
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingBottom: 10,
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
  headerCopy: {
    flex: 1,
    gap: 2
  },
  headerTitle: {
    color: Colors.text1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold
  },
  headerSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  stepWrap: {
    paddingBottom: 12,
    paddingHorizontal: Spacing.screen
  },
  revisitContextWrap: {
    paddingBottom: 8,
    paddingHorizontal: Spacing.screen
  },
  scroll: {
    gap: 12,
    paddingBottom: 130,
    paddingHorizontal: Spacing.screen
  },
  summaryCard: {
    backgroundColor: Colors.brand50,
    borderRadius: Radius.card,
    gap: 6,
    padding: 12
  },
  summaryHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  editLink: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  summaryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  summaryTamil: {
    color: Colors.brand700,
    fontSize: 14,
    fontWeight: "600"
  },
  summaryEnglish: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  sectionLabel: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  notesWrap: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    minHeight: 72,
    padding: 14
  },
  notesInput: {
    color: Colors.text1,
    fontSize: FontSize.md,
    minHeight: 48
  },
  evidenceHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  countChip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  countChipText: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  mediaActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  mediaBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 4,
    minWidth: "47%",
    paddingHorizontal: 12,
    paddingVertical: 14
  },
  mediaBtnActive: {
    backgroundColor: Colors.red,
    borderColor: Colors.red
  },
  mediaBtnText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  mediaBtnTextActive: {
    color: Colors.surface
  },
  attachmentList: {
    gap: 8
  },
  attachmentCard: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10
  },
  attachmentThumb: {
    borderRadius: Radius.md,
    height: 44,
    width: 44
  },
  attachmentIconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  attachmentCopy: {
    flex: 1,
    gap: 2
  },
  attachmentName: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  attachmentType: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    textTransform: "capitalize"
  },
  gpsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4
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
