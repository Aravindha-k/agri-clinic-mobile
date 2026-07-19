import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { PrimaryButton } from "../../components/ui";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { VisitFlowHeader } from "../../components/visit/VisitFlowHeader";
import {
  VisitBottomFooter,
  VISIT_FOOTER_SCROLL_SPACE
} from "../../components/visit/VisitBottomFooter";
import { pickVisitPhotoFromCamera, pickVisitPhotoFromGallery } from "../../lib/visitPhotos";
import { useVisitFormStore } from "../../store/visitFormStore";
import { EntranceBlocks } from "../../components/ui/EntranceBlocks";
import { useVisitEntranceKey } from "../../context/VisitEntranceContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

const MAX_PHOTOS = 5;

type Props = {
  onBack: () => void;
};

export function VisitCreateStep3({ onBack }: Props) {
  const { t } = useI18n();
  const replayKey = useVisitEntranceKey();
  const setStep = useVisitFormStore((s) => s.setStep);
  const fieldNotes = useVisitFormStore((s) => s.fieldNotes);
  const photos = useVisitFormStore((s) => s.photos);

  const setFieldNotes = useVisitFormStore((s) => s.setFieldNotes);
  const addPhoto = useVisitFormStore((s) => s.addPhoto);
  const removePhoto = useVisitFormStore((s) => s.removePhoto);

  const [hint, setHint] = useState("");

  function continueToReview() {
    setHint("");
    setStep(4);
  }

  async function handleAddCameraPhoto() {
    if (photos.length >= MAX_PHOTOS) {
      setHint(t("visitFlow.photoLimitReached", { count: MAX_PHOTOS }));
      return;
    }
    const photo = await pickVisitPhotoFromCamera();
    if (photo) addPhoto(photo);
  }

  async function handleAddGalleryPhoto() {
    if (photos.length >= MAX_PHOTOS) {
      setHint(t("visitFlow.photoLimitReached", { count: MAX_PHOTOS }));
      return;
    }
    const photo = await pickVisitPhotoFromGallery();
    if (photo) addPhoto(photo);
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
              {photos.length}/{MAX_PHOTOS}
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
    flex: 1,
    gap: 4,
    minWidth: "47%",
    paddingHorizontal: 12,
    paddingVertical: 14
  },
  mediaBtnText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
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
  footerBtn: {
    width: "100%"
  }
});
