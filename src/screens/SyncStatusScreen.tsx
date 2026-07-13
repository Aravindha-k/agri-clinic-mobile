import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatCard, ScreenCanvas, StackScreenHeader } from "../../mobile/components/layout";
import { StatusChip } from "../../mobile/components/ui";
import { useConnectivityOnline } from "../hooks/useConnectivityOnline";
import { useI18n } from "../i18n/I18nContext";
import { formatRelativeTimeLocalized } from "../i18n";
import { RootStackParamList } from "../navigation/types";
import { refreshSyncStoreCounts } from "../../mobile/lib/sync/offlineSyncManager";
import { getBackgroundSchedulerStatus } from "../../mobile/lib/sync/syncScheduler";
import { getFieldPendingCounts } from "../../mobile/lib/sync/pendingCounts";
import { useSyncStore, type SyncHealthState } from "../../mobile/lib/store/syncStore";
import { refreshControlProps } from "../theme/refresh";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../../mobile/lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "SyncStatus">;

function healthChipVariant(health: SyncHealthState): "success" | "warning" | "error" | "pending" | "offline" | "blue" {
  switch (health) {
    case "synced":
      return "success";
    case "offline_saving":
    case "waiting_internet":
      return "warning";
    case "syncing":
      return "blue";
    case "auth_required":
    case "attention_required":
      return "error";
    default:
      return "offline";
  }
}

function healthIcon(health: SyncHealthState): keyof typeof Ionicons.glyphMap {
  switch (health) {
    case "synced":
      return "checkmark-circle";
    case "offline_saving":
      return "cloud-offline";
    case "syncing":
      return "sync";
    case "waiting_internet":
      return "wifi-outline";
    case "auth_required":
      return "lock-closed";
    case "attention_required":
      return "alert-circle";
    default:
      return "cloud-outline";
  }
}

function DetailRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, warn ? styles.warn : null]}>{value}</Text>
    </View>
  );
}

export function SyncStatusScreen({ navigation }: Props) {
  const { t, language } = useI18n();
  const online = useConnectivityOnline();
  const [refreshing, setRefreshing] = useState(false);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const lastAttemptAt = useSyncStore((s) => s.lastAutomaticAttemptAt);
  const nextRetryAt = useSyncStore((s) => s.nextScheduledRetryAt);
  const syncHealth = useSyncStore((s) => s.syncHealth);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const counts = getFieldPendingCounts();
  const scheduler = getBackgroundSchedulerStatus();

  const effectiveHealth: SyncHealthState =
    !online && counts.total > 0 ? "offline_saving" : isSyncing ? "syncing" : syncHealth;

  const healthLabel = (() => {
    switch (effectiveHealth) {
      case "synced":
        return t("syncHealth.synced");
      case "offline_saving":
        return t("syncHealth.offlineSaving");
      case "syncing":
        return t("syncHealth.syncing");
      case "waiting_internet":
        return t("syncHealth.waitingInternet");
      case "auth_required":
        return t("syncHealth.authRequired");
      case "attention_required":
        return t("syncHealth.attentionRequired");
      default:
        return t("syncHealth.synced");
    }
  })();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshSyncStoreCounts();
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <StackScreenHeader
        title={t("syncHealth.statusTitle")}
        subtitle={t("syncHealth.statusSubtitle")}
        onBack={() => navigation.goBack()}
        includeSafeTop={false}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} {...refreshControlProps} />
        }
      >
        <FlatCard style={styles.heroCard}>
          <StatusChip
            label={healthLabel}
            variant={healthChipVariant(effectiveHealth)}
            icon={healthIcon(effectiveHealth)}
            style={styles.statusChip}
          />
          <Text style={styles.hint}>{t("syncHealth.readOnlyHint")}</Text>
        </FlatCard>

        <Text style={styles.sectionTitle}>{t("fieldWorkflow.pendingData")}</Text>
        <FlatCard style={styles.card}>
          <DetailRow label={t("fieldWorkflow.pendingVisits")} value={String(counts.visits)} />
          <View style={styles.rowDivider} />
          <DetailRow label={t("fieldWorkflow.pendingPhotos")} value={String(counts.photos)} />
          <View style={styles.rowDivider} />
          <DetailRow label={t("fieldWorkflow.pendingGps")} value={String(counts.gps)} />
          <View style={styles.rowDivider} />
          <DetailRow label={t("fieldWorkflow.pendingWorkday")} value={String(counts.workdayOps)} />
          {counts.permanentFailures > 0 ? (
            <>
              <View style={styles.rowDivider} />
              <DetailRow
                label={t("fieldWorkflow.needsAttention")}
                value={String(counts.permanentFailures)}
                warn
              />
            </>
          ) : null}
        </FlatCard>

        <Text style={styles.sectionTitle}>{t("syncHealth.syncDetails")}</Text>
        <FlatCard style={styles.card}>
          <DetailRow
            label={t("fieldWorkflow.lastSynced")}
            value={
              lastSyncedAt
                ? formatRelativeTimeLocalized(language, lastSyncedAt)
                : t("offlineSync.notSyncedYet")
            }
          />
          <View style={styles.rowDivider} />
          <DetailRow
            label={t("syncHealth.lastAttempt")}
            value={
              lastAttemptAt
                ? formatRelativeTimeLocalized(language, lastAttemptAt)
                : t("common.never")
            }
          />
          <View style={styles.rowDivider} />
          <DetailRow
            label={t("syncHealth.nextRetry")}
            value={
              nextRetryAt
                ? formatRelativeTimeLocalized(language, nextRetryAt)
                : t("syncHealth.notScheduled")
            }
          />
          <View style={styles.rowDivider} />
          <DetailRow
            label={t("fieldWorkflow.networkState")}
            value={online ? t("syncHealth.online") : t("syncHealth.offline")}
          />
          <View style={styles.rowDivider} />
          <DetailRow
            label={t("syncHealth.backgroundWorker")}
            value={
              scheduler.workerScheduled
                ? t("syncHealth.workerScheduled")
                : t("syncHealth.workerIdle")
            }
          />
        </FlatCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.bg, flex: 1 },
  body: {
    gap: Spacing.sm,
    padding: Spacing.screen,
    paddingBottom: Layout.stackScrollBottom
  },
  heroCard: {
    gap: Spacing.sm,
    padding: Spacing.md
  },
  statusChip: {
    alignSelf: "flex-start"
  },
  hint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    lineHeight: 20
  },
  sectionTitle: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.xs,
    textTransform: "uppercase"
  },
  card: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  detailRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.md,
    paddingVertical: Spacing.sm
  },
  detailLabel: {
    color: Colors.text3,
    flexShrink: 0,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: 20,
    minWidth: 120,
    width: 120
  },
  detailValue: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    lineHeight: 22
  },
  rowDivider: {
    backgroundColor: Colors.border,
    height: StyleSheet.hairlineWidth
  },
  warn: { color: Colors.amberText }
});
