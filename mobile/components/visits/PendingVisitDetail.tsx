import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../../../src/i18n/I18nContext";
import type { PendingVisitRecord } from "../../lib/pendingVisitsQueue";
import { removePendingVisit } from "../../lib/pendingVisitsQueue";
import { runAutomaticSync } from "../../lib/sync/automaticSyncCoordinator";
import { retryVisitFromQueue } from "../../lib/sync/offlineSyncManager";
import { emitVisitDataRefresh } from "../../lib/visit/visitDataRefresh";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { GhostButton, PrimaryButton } from "../ui";
import { VisitFlowHeader } from "../visit/VisitFlowHeader";

export function PendingVisitDetail({
  visit,
  onClose,
  onChanged
}: {
  visit: PendingVisitRecord | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [retrying, setRetrying] = useState(false);
  if (!visit) return null;
  const currentVisit = visit;
  const syncing = currentVisit.status === "syncing";

  async function retry() {
    if (retrying || syncing) return;
    setRetrying(true);
    try {
      retryVisitFromQueue(currentVisit.local_sync_id);
      await runAutomaticSync("diagnostics_retry");
      emitVisitDataRefresh();
      onChanged();
      onClose();
    } finally {
      setRetrying(false);
    }
  }

  function confirmDelete() {
    if (syncing) {
      Alert.alert(t("visitFlow.deletePendingTitle"), t("visitFlow.deletePendingSyncingBlocked"));
      return;
    }
    Alert.alert(t("visitFlow.deletePendingTitle"), t("visitFlow.deletePendingBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("visitFlow.deletePending"),
        style: "destructive",
        onPress: () => {
          void removePendingVisit(currentVisit.local_sync_id).then(() => {
            emitVisitDataRefresh();
            onChanged();
            onClose();
          });
        }
      }
    ]);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <VisitFlowHeader title={t("visitFlow.pendingVisitDetails")} subtitle="" onClose={onClose} />
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}>
          <View style={styles.statusCard}>
            <Ionicons name="time-outline" size={24} color={Colors.amber} />
            <View style={styles.statusCopy}>
              <Text style={styles.title}>{visit.values.farmer_name || t("visitFlow.farmer")}</Text>
              <Text style={styles.status}>{t(`visitFlow.pendingStatus_${visit.status}`)}</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Detail label={t("visitFlow.cropSummary")} value={visit.values.crop_name || "—"} />
            <Detail label={t("visitFlow.problemSummary")} value={visit.values.problem_seen || "—"} />
            <Detail
              label={t("visitFlow.observationOptional")}
              value={visit.values.observation?.trim() || t("visitFlow.noObservationOptional")}
            />
            <Detail label={t("visitFlow.attempts")} value={String(visit.attempts)} />
            <Detail label={t("visitFlow.photos")} value={String(visit.photos.length)} />
            <Detail
              label={t("visitFlow.gpsSummary")}
              value={
                visit.values.latitude != null && visit.values.longitude != null
                  ? t("visitFlow.gpsConfirmed")
                  : t("visitFlow.gpsNotCaptured")
              }
            />
            <Detail
              label={t("visitFlow.savedAt")}
              value={new Date(visit.createdAt).toLocaleString()}
            />
          </View>

          {visit.photos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {visit.photos.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.uri }} style={styles.photo} />
              ))}
            </ScrollView>
          ) : null}

          {visit.lastError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorLabel}>{t("visitFlow.lastSyncError")}</Text>
              <Text style={styles.errorText}>{visit.lastError}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <PrimaryButton
            label={t("common.retry")}
            onPress={() => void retry()}
            loading={retrying}
            disabled={retrying || syncing}
          />
          <GhostButton
            label={t("visitFlow.deletePending")}
            onPress={confirmDelete}
            disabled={syncing}
          />
        </View>
      </View>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.bg, flex: 1 },
  body: { gap: Spacing.md, padding: Spacing.screen },
  statusCard: {
    alignItems: "center",
    backgroundColor: Colors.amberBg,
    borderRadius: Radius.card,
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.lg
  },
  statusCopy: { flex: 1, gap: 3 },
  title: { color: Colors.text1, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  status: { color: Colors.amberText, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg
  },
  detailRow: { flexDirection: "row", gap: Spacing.md, paddingVertical: Spacing.sm },
  detailLabel: { color: Colors.text3, fontSize: FontSize.sm, width: 110 },
  detailValue: { color: Colors.text1, flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  photoRow: { gap: Spacing.sm },
  photo: { borderRadius: Radius.inner, height: 72, width: 72 },
  errorCard: { backgroundColor: Colors.redBg, borderRadius: Radius.lg, gap: 4, padding: Spacing.md },
  errorLabel: { color: Colors.redText, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  errorText: { color: Colors.redText, fontSize: FontSize.sm },
  actions: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md
  }
});
