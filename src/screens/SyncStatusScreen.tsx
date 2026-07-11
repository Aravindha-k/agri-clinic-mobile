import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatCard, ScreenCanvas, StackScreenHeader } from "../../mobile/components/layout";
import { useConnectivityOnline } from "../hooks/useConnectivityOnline";
import { useI18n } from "../i18n/I18nContext";
import { formatRelativeTimeLocalized } from "../i18n";
import { RootStackParamList } from "../navigation/types";
import { refreshSyncStoreCounts } from "../../mobile/lib/sync/offlineSyncManager";
import { getBackgroundSchedulerStatus } from "../../mobile/lib/sync/syncScheduler";
import { getFieldPendingCounts } from "../../mobile/lib/sync/pendingCounts";
import { useSyncStore } from "../../mobile/lib/store/syncStore";
import { refreshControlProps } from "../theme/refresh";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../../mobile/lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "SyncStatus">;

export function SyncStatusScreen({ navigation }: Props) {
  const { t, language } = useI18n();
  const online = useConnectivityOnline();
  const [refreshing, setRefreshing] = useState(false);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const lastAttemptAt = useSyncStore((s) => s.lastAutomaticAttemptAt);
  const nextRetryAt = useSyncStore((s) => s.nextScheduledRetryAt);
  const syncHealth = useSyncStore((s) => s.syncHealth);
  const syncPhase = useSyncStore((s) => s.syncPhase);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const counts = getFieldPendingCounts();
  const scheduler = getBackgroundSchedulerStatus();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshSyncStoreCounts();
    setRefreshing(false);
  }, []);

  const healthLabel = (() => {
    switch (syncHealth) {
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
        return syncPhase;
    }
  })();

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} {...refreshControlProps} />}
      >
        <FlatCard style={styles.card}>
          <View style={styles.row}>
            <Ionicons
              name={isSyncing ? "sync" : online ? "cloud-done-outline" : "cloud-offline-outline"}
              size={22}
              color={Colors.brand700}
            />
            <Text style={styles.statusTitle}>{healthLabel}</Text>
          </View>
          <Text style={styles.hint}>{t("syncHealth.readOnlyHint")}</Text>
        </FlatCard>

        <FlatCard style={styles.card}>
          <Text style={styles.section}>{t("fieldWorkflow.pendingVisits")}</Text>
          <Text style={styles.value}>{counts.visits}</Text>
          <Text style={styles.section}>{t("fieldWorkflow.pendingPhotos")}</Text>
          <Text style={styles.value}>{counts.photos}</Text>
          <Text style={styles.section}>{t("fieldWorkflow.pendingGps")}</Text>
          <Text style={styles.value}>{counts.gps}</Text>
          <Text style={styles.section}>{t("fieldWorkflow.pendingWorkday")}</Text>
          <Text style={styles.value}>{counts.workdayOps}</Text>
          {counts.permanentFailures > 0 ? (
            <>
              <Text style={styles.section}>{t("fieldWorkflow.needsAttention")}</Text>
              <Text style={[styles.value, styles.warn]}>{counts.permanentFailures}</Text>
            </>
          ) : null}
        </FlatCard>

        <FlatCard style={styles.card}>
          <Text style={styles.section}>{t("fieldWorkflow.lastSynced")}</Text>
          <Text style={styles.value}>
            {lastSyncedAt
              ? formatRelativeTimeLocalized(language, lastSyncedAt)
              : t("offlineSync.notSyncedYet")}
          </Text>
          <Text style={styles.section}>{t("syncHealth.lastAttempt")}</Text>
          <Text style={styles.value}>
            {lastAttemptAt
              ? formatRelativeTimeLocalized(language, lastAttemptAt)
              : t("common.never")}
          </Text>
          <Text style={styles.section}>{t("syncHealth.nextRetry")}</Text>
          <Text style={styles.value}>
            {nextRetryAt
              ? formatRelativeTimeLocalized(language, nextRetryAt)
              : t("syncHealth.notScheduled")}
          </Text>
          <Text style={styles.section}>{t("fieldWorkflow.networkState")}</Text>
          <Text style={styles.value}>{online ? t("syncHealth.online") : t("syncHealth.offline")}</Text>
          <Text style={styles.section}>{t("syncHealth.backgroundWorker")}</Text>
          <Text style={styles.value}>
            {scheduler.workerScheduled ? t("syncHealth.workerScheduled") : t("syncHealth.workerIdle")}
          </Text>
        </FlatCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.bg, flex: 1 },
  body: {
    gap: Spacing.md,
    padding: Spacing.screen,
    paddingBottom: Layout.stackScrollBottom
  },
  card: { gap: Spacing.xs },
  row: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  statusTitle: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  hint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginTop: Spacing.xs
  },
  section: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.sm
  },
  value: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  warn: { color: Colors.amberText }
});
