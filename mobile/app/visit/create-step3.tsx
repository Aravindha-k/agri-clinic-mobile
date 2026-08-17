import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useEmployee } from "../../../src/storage/EmployeeContext";
import { PrimaryButton } from "../../components/ui";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { VisitFlowHeader } from "../../components/visit/VisitFlowHeader";
import {
  VisitBottomFooter,
  VISIT_FOOTER_SCROLL_SPACE
} from "../../components/visit/VisitBottomFooter";
import {
  EvidenceStampBurner,
  type EvidenceStampJob
} from "../../components/visit/EvidenceStampBurner";
import {
  deleteTempUri,
  MAX_VISIT_PHOTOS,
  prepareCameraEvidence,
  prepareGalleryEvidence,
  toVisitPhotoAsset,
  type PreparedEvidencePhoto
} from "../../lib/visitEvidenceCapture";
import { useVisitFormStore } from "../../store/visitFormStore";
import { EntranceBlocks } from "../../components/ui/EntranceBlocks";
import { useVisitEntranceKey } from "../../context/VisitEntranceContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  onBack: () => void;
};

export function VisitCreateStep3({ onBack }: Props) {
  const { t } = useI18n();
  const replayKey = useVisitEntranceKey();
  const { employee } = useEmployee();
  const setStep = useVisitFormStore((s) => s.setStep);
  const fieldNotes = useVisitFormStore((s) => s.fieldNotes);
  const photos = useVisitFormStore((s) => s.photos);
  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);

  const setFieldNotes = useVisitFormStore((s) => s.setFieldNotes);
  const addPhoto = useVisitFormStore((s) => s.addPhoto);
  const removePhoto = useVisitFormStore((s) => s.removePhoto);

  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState("");
  const [stampJob, setStampJob] = useState<EvidenceStampJob | null>(null);
  const pendingRef = useRef<PreparedEvidencePhoto[]>([]);

  const farmerName = farmer?.name || newFarmer?.name || undefined;

  const runNextStamp = useCallback(() => {
    const next = pendingRef.current[0];
    if (!next) {
      setStampJob(null);
      setBusy("");
      return;
    }
    setStampJob({ id: next.tempId, sourceUri: next.sourceUri, meta: next.meta });
  }, []);

  const onStampComplete = useCallback(
    (id: string, stampedUri: string) => {
      const prepared = pendingRef.current.find((row) => row.tempId === id);
      pendingRef.current = pendingRef.current.filter((row) => row.tempId !== id);
      if (prepared) {
        addPhoto(toVisitPhotoAsset(prepared, stampedUri));
        if (prepared.sourceUri !== stampedUri) {
          void deleteTempUri(prepared.sourceUri);
        }
        if (prepared.originalUri !== prepared.sourceUri && prepared.originalUri !== stampedUri) {
          void deleteTempUri(prepared.originalUri);
        }
      }
      runNextStamp();
    },
    [addPhoto, runNextStamp]
  );

  const onStampError = useCallback(
    (id: string, message: string) => {
      const prepared = pendingRef.current.find((row) => row.tempId === id);
      pendingRef.current = pendingRef.current.filter((row) => row.tempId !== id);
      if (prepared) {
        addPhoto({
          ...toVisitPhotoAsset(prepared, prepared.sourceUri),
          stampFailed: true
        });
      }
      setHint(message);
      runNextStamp();
    },
    [addPhoto, runNextStamp]
  );

  function continueToReview() {
    setHint("");
    setStep(4);
  }

  async function handleAddCameraPhoto() {
    if (photos.length >= MAX_VISIT_PHOTOS) {
      setHint(t("visitFlow.photoLimitReached", { count: MAX_VISIT_PHOTOS }));
      return;
    }
    setBusy(t("visitFlow.gpsGettingLocation"));
    const prepared = await prepareCameraEvidence({
      employee,
      farmerName
    });
    if (!prepared) {
      setBusy("");
      return;
    }
    pendingRef.current = [...pendingRef.current, prepared];
    setBusy(t("visitFlow.stampingPhoto"));
    runNextStamp();
  }

  async function handleAddGalleryPhoto() {
    const remaining = MAX_VISIT_PHOTOS - photos.length;
    if (remaining <= 0) {
      setHint(t("visitFlow.photoLimitReached", { count: MAX_VISIT_PHOTOS }));
      return;
    }
    setBusy(t("visitFlow.gpsGettingLocation"));
    const prepared = await prepareGalleryEvidence({
      remaining,
      employee,
      farmerName
    });
    if (!prepared.length) {
      setBusy("");
      return;
    }
    pendingRef.current = [...pendingRef.current, ...prepared];
    setBusy(t("visitFlow.stampingPhoto"));
    runNextStamp();
  }

  return (
    <View style={styles.screen}>
      <VisitFlowHeader title={t("visitFlow.fieldNotesEvidence")} subtitle={t("visitFlow.step3of4")} onBack={onBack} />

      <View style={styles.stepWrap}>
        <StepIndicator step={3} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <EntranceBlocks replayKey={replayKey} startStep={0} variant="card">
        <View>
        <Text style={styles.notesHint}>{t("visitFlow.fieldNotesHint")}</Text>

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
        </View>

        <View>
        <View style={styles.evidenceHead}>
          <Text style={styles.sectionLabel}>{t("visitFlow.evidencePhotos")}</Text>
          <View style={styles.countChip}>
            <Text style={styles.countChipText}>
              {t("visitFlow.photosSelected", { count: photos.length })}
            </Text>
          </View>
        </View>

        <View style={styles.mediaActions}>
          <Pressable onPress={() => void handleAddCameraPhoto()} style={styles.mediaBtn} disabled={Boolean(busy)}>
            <Ionicons name="camera-outline" size={22} color={Colors.brand700} />
            <Text style={styles.mediaBtnText}>{t("visitFlow.takePhoto")}</Text>
          </Pressable>
          <Pressable onPress={() => void handleAddGalleryPhoto()} style={styles.mediaBtn} disabled={Boolean(busy)}>
            <Ionicons name="images-outline" size={22} color={Colors.brand700} />
            <Text style={styles.mediaBtnText}>{t("visitFlow.gallery")}</Text>
          </Pressable>
        </View>

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color={Colors.brand700} />
            <Text style={styles.busyText}>{busy}</Text>
          </View>
        ) : null}

        <View style={styles.attachmentList}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.attachmentCard}>
              <Image source={{ uri: photo.uri }} style={styles.attachmentThumb} />
              <View style={styles.attachmentCopy}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {photo.locationKind === "uploaded"
                    ? t("visitFlow.uploadedAtLabel")
                    : t("visitFlow.capturedAtLabel")}
                </Text>
                <Text style={styles.attachmentType} numberOfLines={1}>
                  {photo.address ||
                    (photo.latitude != null && photo.longitude != null
                      ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
                      : t("visitFlow.photo"))}
                </Text>
                {photo.stampFailed ? (
                  <Text style={styles.stampFailed}>{t("visitFlow.stampFailed")}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => removePhoto(photo.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={Colors.red} />
              </Pressable>
            </View>
          ))}
        </View>
        </View>
        </EntranceBlocks>
      </ScrollView>

      <VisitBottomFooter hint={hint}>
        <PrimaryButton
          label={t("visitFlow.continueToReview")}
          onPress={continueToReview}
          icon={<Ionicons name="arrow-forward" size={18} color={Colors.surface} />}
          style={styles.footerBtn}
        />
      </VisitBottomFooter>

      <EvidenceStampBurner job={stampJob} onComplete={onStampComplete} onError={onStampError} />
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
    gap: 12,
    paddingBottom: VISIT_FOOTER_SCROLL_SPACE,
    paddingHorizontal: Spacing.screen
  },
  sectionLabel: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  notesHint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: 4
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
    backgroundColor: Colors.brand50,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  countChipText: {
    color: Colors.brand700,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold
  },
  mediaActions: {
    flexDirection: "row",
    gap: 10
  },
  mediaBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    paddingVertical: 14
  },
  mediaBtnText: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  busyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4
  },
  busyText: {
    color: Colors.text2,
    fontSize: FontSize.sm
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
    padding: 8
  },
  attachmentThumb: {
    borderRadius: Radius.md,
    height: 56,
    width: 56
  },
  attachmentCopy: {
    flex: 1,
    minWidth: 0
  },
  attachmentName: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  attachmentType: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    marginTop: 2
  },
  stampFailed: {
    color: Colors.red,
    fontSize: FontSize.xs,
    marginTop: 2
  },
  footerBtn: {
    width: "100%"
  }
});
