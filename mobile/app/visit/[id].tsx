import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import type { Visit } from "../../../src/api/visits";
import type { VisitAttachment } from "../../../src/api/visitAttachments";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { VisitsStackParamList } from "../../../src/navigation/types";
import { TAB_BAR_CONTENT_HEIGHT } from "../../../src/theme/tabBar";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { formatDisplayDateTime, visitDisplayIso } from "../../../src/utils/format";
import { formatVisitPlaceLine } from "../../../src/utils/visitStatus";
import { resolveVisitFarmer } from "../../../src/utils/visitFarmer";
import { useI18n } from "../../../src/i18n/I18nContext";
import { ScreenLoader } from "../../components/layout/ScreenLoader";
import { ScreenEntranceShell } from "../../components/layout";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import {
  cropFromVisit,
  problemCategoryFromVisit
} from "../../lib/farmerProfileApi";
import { pickVisitPhotoFromCamera } from "../../lib/visitPhotos";
import {
  categoryTone,
  fetchVisitAttachments,
  fetchVisitDetail,
  inferSeverity,
  parseFieldNotes,
  patchMobileVisit,
  removeVisitAttachment,
  resolveMediaUrl,
  severityLabel,
  severityVariant,
  uploadVisitPhoto,
  visitObservationText,
  visitRecommendationText
} from "../../lib/visitDetailApi";
import { Avatar, EmptyState, GhostButton, PrimaryButton, SectionHeader, StatusChip } from "../../components/ui";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = NativeStackScreenProps<VisitsStackParamList, "VisitDetail">;

function visitHeaderDate(visit: Visit) {
  const iso = visitDisplayIso(visit);
  if (!iso) return "Visit";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Visit";
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function openMaps(lat: string | number, lng: string | number) {
  const la = String(lat);
  const ln = String(lng);
  const url =
    Platform.OS === "ios"
      ? `maps://?q=${la},${ln}`
      : `geo:${la},${ln}?q=${la},${ln}`;
  void Linking.openURL(url).catch(() => {
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${la},${ln}`);
  });
}

export default function VisitDetailScreen({ route, navigation }: Props) {
  useSecureScreen();
  const { t } = useI18n();
  const visitId = route.params.id;
  const fromSubmit = route.params.fromSubmit === true;
  const { width } = useWindowDimensions();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsetsCompat();
  const tabBarInset = TAB_BAR_CONTENT_HEIGHT + safeBottom;
  const editFooterHeight = 64;
  const refreshControlProps = useRefreshControlProps();
  const { bumpAfterVisitChange } = useFieldDataRefresh();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [attachments, setAttachments] = useState<VisitAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lastEditedAt, setLastEditedAt] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const [draftFieldNotes, setDraftFieldNotes] = useState("");
  const [draftObservation, setDraftObservation] = useState("");
  const [draftRecommendation, setDraftRecommendation] = useState("");

  const photoWidth = (width - Spacing.screen * 2 - 10) / 2;
  const imageUrls = useMemo(
    () =>
      attachments
        .map((a) => resolveMediaUrl(a.file_url))
        .filter((url): url is string => Boolean(url)),
    [attachments]
  );

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");
        const row = await fetchVisitDetail(visitId);
        setVisit(row);
        const parsed = parseFieldNotes(row.field_notes);
        setDraftFieldNotes(parsed.fieldNotes);
        setDraftObservation(visitObservationText(row));
        setDraftRecommendation(visitRecommendationText(row));

        const atts = await fetchVisitAttachments(visitId).catch(() => [] as VisitAttachment[]);
        setAttachments(atts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load visit.");
      } finally {
        if (!isRefresh) setLoading(false);
        setRefreshing(false);
      }
    },
    [visitId]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const farmer = useMemo(() => (visit ? resolveVisitFarmer(visit) : null), [visit]);
  const parsedNotes = useMemo(() => parseFieldNotes(visit?.field_notes), [visit?.field_notes]);
  const severity = visit ? inferSeverity(visit, parsedNotes) : "medium";
  const categoryCode =
    visit?.field_visit?.problem_category?.code ||
    (visit ? problemCategoryFromVisit(visit) : "");
  const categoryName = visit?.field_visit?.problem_category?.name || categoryCode || "Problem";
  const tamilName =
    visit?.field_visit?.problem_master?.tamil_name ||
    visit?.field_visit?.problem_subcategory?.tamil_name ||
    visit?.problem_seen ||
    "—";
  const englishName =
    visit?.field_visit?.problem_master?.name ||
    visit?.field_visit?.problem_subcategory?.name ||
    visit?.problem_description ||
    visit?.problem_seen ||
    "—";
  const tone = categoryTone(categoryCode);
  const address = visit ? formatVisitPlaceLine(visit, "Location not recorded") : "";
  const hasGps = visit?.latitude != null && visit?.longitude != null && String(visit.latitude) !== "";

  const adviceBlocks = useMemo(() => {
    if (!visit) return [];
    return [
      { key: "fertilizer", label: "Fertilizer advice", value: visit.fertilizer_advice },
      { key: "pesticide", label: "Pesticide advice", value: visit.pesticide_advice },
      { key: "irrigation", label: "Irrigation advice", value: visit.irrigation_advice },
      { key: "general", label: "General advice", value: visit.general_advice }
    ].filter((row) => row.value?.trim());
  }, [visit]);

  function cancelEdit() {
    if (!visit) return;
    const parsed = parseFieldNotes(visit.field_notes);
    setDraftFieldNotes(parsed.fieldNotes);
    setDraftObservation(visitObservationText(visit));
    setDraftRecommendation(visitRecommendationText(visit));
    setEditMode(false);
  }

  async function handleSave() {
    if (!visit) return;
    const observation = draftObservation.trim();
    const recommendation = draftRecommendation.trim();
    if (!observation && !recommendation) {
      Alert.alert(t("visitFlow.editVisit"), t("visitFlow.errObservationOrAdvice"));
      return;
    }
    setSaving(true);
    try {
      const severityLine = `Severity: ${severityLabel(severity)}`;
      const mergedNotes = [draftFieldNotes.trim(), severityLine].filter(Boolean).join("\n");
      const updated = await patchMobileVisit(visit.id, {
        observation,
        recommendation: recommendation || undefined,
        action_taken: recommendation || undefined,
        general_advice: recommendation || undefined,
        field_notes: mergedNotes
      });
      setVisit(updated);
      setLastEditedAt(updated.updated_at || new Date().toISOString());
      setEditMode(false);
      bumpAfterVisitChange();
    } catch (err) {
      Alert.alert("Save failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPhoto() {
    if (!visit) return;
    const photo = await pickVisitPhotoFromCamera();
    if (!photo) return;
    setUploadingPhoto(true);
    try {
      const next = await uploadVisitPhoto(visit.id, photo);
      setAttachments(next);
      bumpAfterVisitChange();
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function confirmDeleteAttachment(attachment: VisitAttachment) {
    if (!visit) return;
    Alert.alert("Delete photo", "Remove this attachment from the visit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await removeVisitAttachment(visit.id, attachment.id);
              setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
            } catch (err) {
              Alert.alert("Delete failed", err instanceof Error ? err.message : "Please try again.");
            }
          })();
        }
      }
    ]);
  }

  if (loading) {
    return (
      <ScreenEntranceShell style={[styles.screen, { paddingTop: safeTop }]}>
        {() => (
          <>
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={18} color={Colors.text1} />
              </Pressable>
              <Text style={styles.headerDate}>{t("visitFlow.visitDetail")}</Text>
              <View style={styles.iconBtn} />
            </View>
            <ScreenLoader />
          </>
        )}
      </ScreenEntranceShell>
    );
  }

  if (error || !visit || !farmer) {
    return (
      <ScreenEntranceShell style={[styles.screen, { paddingTop: safeTop }]}>
        {(entranceTick) => (
          <>
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={18} color={Colors.text1} />
              </Pressable>
              <Text style={styles.headerDate}>Visit</Text>
              <View style={styles.iconBtn} />
            </View>
            <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
              <EmptyState
                icon="document-text-outline"
                title="Could not load visit"
                subtitle={error || "Try again."}
                action="Retry"
                onAction={() => void load(false)}
              />
            </FadeInSection>
          </>
        )}
      </ScreenEntranceShell>
    );
  }

  const fieldNotesText = editMode ? draftFieldNotes : parsedNotes.fieldNotes;
  const observationText = editMode ? draftObservation : visitObservationText(visit);
  const recommendationText = editMode ? draftRecommendation : visitRecommendationText(visit);
  const statusLabel = "Submitted";
  const statusVariant = "green" as const;
  const scrollBottomPad = editMode ? tabBarInset + editFooterHeight + 16 : tabBarInset + 16;

  return (
    <ScreenEntranceShell style={[styles.screen, { paddingTop: safeTop }]}>
      {(entranceTick) => (
        <>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={18} color={Colors.text1} />
        </Pressable>
        <Text style={styles.headerDate} numberOfLines={1}>
          {visitHeaderDate(visit)}
        </Text>
        <View style={styles.headerRight}>
          <StatusChip label={statusLabel} variant={statusVariant} />
          {editMode ? (
            <>
              <Pressable onPress={cancelEdit} style={styles.headerTextBtn}>
                <Text style={styles.headerCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSave()}
                disabled={saving}
                style={[styles.headerSaveBtn, saving && styles.headerSaveBtnDisabled]}
              >
                <Text style={styles.headerSaveText}>{saving ? "Saving…" : "Save"}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => setEditMode(true)} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={18} color={Colors.text1} />
            </Pressable>
          )}
        </View>
      </View>
      {fromSubmit ? (
        <View style={styles.submittedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.greenText} />
          <Text style={styles.submittedBannerText}>Visit submitted successfully</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPad }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            {...refreshControlProps}
          />
        }
      >
        <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)} variant="card">
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <Avatar name={farmer.name !== "—" ? farmer.name : "Farmer"} size="lg" />
            <View style={styles.heroCopy}>
              <Text style={styles.heroName} numberOfLines={2}>
                {farmer.name !== "—" ? farmer.name : "Farmer"}
              </Text>
              <Pressable
                onPress={() => {
                  if (farmer.phone && farmer.phone !== "—") void Linking.openURL(`tel:${farmer.phone}`);
                }}
                style={styles.heroSubRow}
              >
                <Text style={styles.heroSub}>
                  {[farmer.village !== "—" ? farmer.village : null, farmer.phone !== "—" ? farmer.phone : null]
                    .filter(Boolean)
                    .join(" · ") || "No contact"}
                </Text>
                {farmer.phone && farmer.phone !== "—" ? (
                  <Ionicons name="call-outline" size={14} color={Colors.brand100} />
                ) : null}
              </Pressable>
            </View>
          </View>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{cropFromVisit(visit)}</Text>
            </View>
            {visit.crop_name && visit.crop_name !== cropFromVisit(visit) ? (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{visit.crop_name}</Text>
              </View>
            ) : null}
          </View>
        </View>
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)} variant="card">
        <View style={styles.card}>
          <View style={styles.problemTop}>
            <View style={[styles.categoryIcon, { backgroundColor: tone.bg }]}>
              <Ionicons name={tone.icon as keyof typeof Ionicons.glyphMap} size={20} color={tone.text} />
            </View>
            <Text style={styles.categoryName}>{categoryName}</Text>
          </View>
          <View style={styles.problemArrowRow}>
            <Ionicons name="arrow-forward" size={16} color={Colors.text4} />
            <View style={styles.problemNames}>
              <Text style={styles.tamilName}>{tamilName}</Text>
              <Text style={styles.englishName}>{englishName}</Text>
            </View>
          </View>
          <View style={styles.problemMeta}>
            <StatusChip label={severityLabel(severity)} variant={severityVariant(severity)} />
            {visit.pest_issue ? <StatusChip label="Pest issue" variant="amber" /> : null}
            {visit.disease_issue ? <StatusChip label="Disease issue" variant="red" /> : null}
          </View>
        </View>
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(2)} variant="card">
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t("visitFlow.observation")}</Text>
          {editMode ? (
            <TextInput
              value={draftObservation}
              onChangeText={setDraftObservation}
              multiline
              style={styles.editInput}
              placeholder={t("visitFlow.observationPlaceholder")}
              placeholderTextColor={Colors.text4}
              textAlignVertical="top"
            />
          ) : (
            <Text style={observationText ? styles.bodyText : styles.mutedText}>
              {observationText || t("visitFlow.noObservation")}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t("visitFlow.recommendation")}</Text>
          {editMode ? (
            <TextInput
              value={draftRecommendation}
              onChangeText={setDraftRecommendation}
              multiline
              style={styles.editInput}
              placeholder={t("visitFlow.recommendationPlaceholder")}
              placeholderTextColor={Colors.text4}
              textAlignVertical="top"
            />
          ) : (
            <Text style={recommendationText ? styles.bodyText : styles.mutedText}>
              {recommendationText || t("visitFlow.noRecommendation")}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t("visitFlow.fieldNotes")}</Text>
          {editMode ? (
            <TextInput
              value={draftFieldNotes}
              onChangeText={setDraftFieldNotes}
              multiline
              style={styles.editInput}
              placeholder="Field notes"
              placeholderTextColor={Colors.text4}
              textAlignVertical="top"
            />
          ) : (
            <Text style={fieldNotesText ? styles.bodyText : styles.mutedText}>
              {fieldNotesText || "No field notes recorded."}
            </Text>
          )}
        </View>
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(3)} variant="card">
        {!editMode && adviceBlocks.length > 0 ? (
          <View style={styles.card}>
            <SectionHeader title="ADVICE" />
            {adviceBlocks.map((block) => (
              <View key={block.key} style={styles.adviceBlock}>
                <Text style={styles.adviceLabel}>{block.label}</Text>
                <Text style={styles.bodyText}>{block.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.locationCard}>
          <View style={styles.locationLeft}>
            <Ionicons name="location-outline" size={18} color={Colors.brand700} />
            <Text style={styles.locationText} numberOfLines={2}>
              {address}
            </Text>
          </View>
          {hasGps ? (
            <GhostButton
              label="Open in Maps"
              onPress={() => openMaps(visit.latitude!, visit.longitude!)}
              style={styles.mapsBtn}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <SectionHeader title="PHOTOS" />
          <View style={styles.photoGrid}>
            {attachments.map((attachment, index) => {
              const uri = resolveMediaUrl(attachment.file_url);
              if (!uri) return null;
              return (
                <Pressable
                  key={attachment.id}
                  onPress={() => setViewerIndex(index)}
                  onLongPress={() => confirmDeleteAttachment(attachment)}
                  style={[styles.photoCell, { width: photoWidth, height: photoWidth }]}
                >
                  <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => void handleAddPhoto()}
              disabled={uploadingPhoto}
              style={[styles.addPhotoCell, { width: photoWidth, height: photoWidth }]}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color={Colors.brand700} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={22} color={Colors.brand700} />
                  <Text style={styles.addPhotoText}>Add photo</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {lastEditedAt ? (
          <View style={styles.editedChipWrap}>
            <StatusChip
              label={`Last edited ${formatDisplayDateTime(lastEditedAt)}`}
              variant="gray"
            />
          </View>
        ) : null}
        </FadeInSection>
      </ScrollView>

      {editMode ? (
        <View style={[styles.editFooter, { bottom: tabBarInset }]}>
          <GhostButton label="Cancel" onPress={cancelEdit} style={styles.editFooterBtn} />
          <PrimaryButton
            label={saving ? t("common.saving") : t("visitFlow.saveChanges")}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving}
            style={styles.editFooterBtnPrimary}
          />
        </View>
      ) : null}

      <Modal visible={viewerIndex != null} transparent animationType="fade" onRequestClose={() => setViewerIndex(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewerIndex(null)}>
          {viewerIndex != null && imageUrls[viewerIndex] ? (
            <Image source={{ uri: imageUrls[viewerIndex] }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
          <Pressable style={styles.viewerClose} onPress={() => setViewerIndex(null)}>
            <Ionicons name="close" size={22} color={Colors.surface} />
          </Pressable>
        </Pressable>
      </Modal>
        </>
      )}
    </ScreenEntranceShell>
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
    paddingHorizontal: Spacing.screen,
    paddingVertical: 10
  },
  headerDate: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  headerTextBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6
  },
  headerCancelText: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  headerSaveBtn: {
    backgroundColor: Colors.brand700,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  headerSaveBtnDisabled: {
    opacity: 0.6
  },
  headerSaveText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  submittedBanner: {
    alignItems: "center",
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
    marginHorizontal: Spacing.screen,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  submittedBannerText: {
    color: Colors.greenText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  headerRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
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
  iconBtnActive: {
    backgroundColor: Colors.brand700,
    borderColor: Colors.brand700
  },
  scroll: {
    gap: 14,
    paddingHorizontal: Spacing.screen,
    paddingTop: 4
  },
  heroCard: {
    backgroundColor: Colors.brand700,
    borderRadius: Radius.card,
    gap: 12,
    padding: 18
  },
  heroRow: {
    flexDirection: "row",
    gap: 12
  },
  heroCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  heroName: {
    color: Colors.surface,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold
  },
  heroSubRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  heroSub: {
    color: Colors.brand100,
    flex: 1,
    fontSize: FontSize.md
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  heroChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  heroChipText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 16
  },
  problemTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  categoryIcon: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  categoryName: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  problemArrowRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8
  },
  problemNames: {
    flex: 1,
    gap: 4
  },
  tamilName: {
    color: Colors.text1,
    fontSize: 16,
    fontWeight: FontWeight.bold
  },
  englishName: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  problemMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  sectionLabel: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4
  },
  bodyText: {
    color: Colors.text1,
    fontSize: FontSize.md,
    lineHeight: 22
  },
  mutedText: {
    color: Colors.text3,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  editInput: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: Colors.text1,
    fontSize: FontSize.md,
    minHeight: 88,
    padding: 12
  },
  adviceBlock: {
    gap: 4
  },
  adviceLabel: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  locationCard: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  locationLeft: {
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    gap: 8
  },
  locationText: {
    color: Colors.text2,
    flex: 1,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  mapsBtn: {
    minWidth: 118
  },
  section: {
    gap: 10
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  photoCell: {
    borderRadius: Radius.lg,
    overflow: "hidden"
  },
  photoImage: {
    height: "100%",
    width: "100%"
  },
  addPhotoCell: {
    alignItems: "center",
    borderColor: Colors.border2,
    borderRadius: Radius.lg,
    borderStyle: "dashed",
    borderWidth: 1.5,
    gap: 4,
    justifyContent: "center"
  },
  addPhotoText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  followUpRow: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 14
  },
  followUpEdit: {
    backgroundColor: Colors.brand50,
    borderRadius: Radius.md,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  followUpEditText: {
    color: Colors.brand700,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  editedChipWrap: {
    alignItems: "flex-start"
  },
  editFooter: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    left: 0,
    padding: 12,
    paddingHorizontal: Spacing.screen,
    position: "absolute",
    right: 0
  },
  editFooterBtn: {
    flex: 1
  },
  editFooterBtnPrimary: {
    flex: 1.4
  },
  viewerBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.92)",
    flex: 1,
    justifyContent: "center"
  },
  viewerImage: {
    height: "80%",
    width: "100%"
  },
  viewerClose: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    top: 56,
    width: 40
  }
});
