import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "../../mobile/components/ui";
import { useI18n } from "../i18n/I18nContext";
import { formatRelativeTimeLocalized } from "../i18n";
import { RootStackParamList } from "../navigation/types";
import { useOfflineSync } from "../storage/OfflineSyncContext";
import { useSyncStore } from "../../mobile/lib/store/syncStore";
import { useConnectivityOnline } from "../../src/hooks/useConnectivityOnline";
import { refreshControlProps } from "../theme/refresh";
import { formatDisplayDateTime } from "../utils/format";
import { FlatCard, ScreenCanvas, StackScreenHeader } from "../../mobile/components/layout";
import { Colors, Enterprise, FontSize, FontWeight, Layout, Radius, Spacing } from "../../mobile/lib/theme";
import { useStackBottomInset } from "../hooks/useStackBottomInset";

type Props = NativeStackScreenProps<RootStackParamList, "OfflineSync">;

export function OfflineSyncScreen({ navigation }: Props) {
  const { t, language } = useI18n();
  const stackBottom = useStackBottomInset();
  const { queue, syncing, refreshQueue, lastSyncAt } = useOfflineSync();
  const pendingGps = useSyncStore((s) => s.pendingGPSCount);
  const pendingPhotos = useSyncStore((s) => s.pendingPhotosCount);
  const pendingWorkday = useSyncStore((s) => s.pendingWorkdayOpsCount);
  const syncPhase = useSyncStore((s) => s.syncPhase);
  const syncHealth = useSyncStore((s) => s.syncHealth);
  const online = useConnectivityOnline();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshQueue();
    setRefreshing(false);
  }, [refreshQueue]);

  const count = queue.length;
  const subtitle =
    count > 0
      ? t(count === 1 ? "offlineSync.subtitleQueued" : "offlineSync.subtitleQueued_plural", { count })
      : t("offlineSync.subtitleClear");

  const statusMessage = (() => {
    if (syncHealth === "auth_required") return t("fieldWorkflow.authRequired");
    if (syncHealth === "attention_required") return t("fieldWorkflow.needsAttention");
    if (!online) return t("syncHealth.offlineSaving");
    if (syncing) return t("fieldWorkflow.syncing");
    if (count > 0) return t("syncHealth.autoSyncHint");
    return t("fieldWorkflow.syncComplete");
  })();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <StackScreenHeader
        title={t("fieldWorkflow.syncCenterTitle")}
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
        includeSafeTop={false}
      />

      <View style={styles.body}>
        <FlatCard style={styles.hero}>
          <View style={styles.cloudWrap}>
            <Ionicons name="cloud-upload" size={36} color={Colors.brand700} />
          </View>
          <Text style={styles.heroTitle}>
            {count ? t("offlineSync.heroWaiting") : t("offlineSync.heroClear")}
          </Text>
          <Text style={styles.heroSub}>{statusMessage}</Text>
        </FlatCard>

        <Text style={styles.meta}>
          {lastSyncAt
            ? t("offlineSync.lastSynced", { time: formatRelativeTimeLocalized(language, lastSyncAt) })
            : t("offlineSync.notSyncedYet")}
        </Text>
        <Text style={styles.meta}>
          {t("fieldWorkflow.pendingVisits")}: {count} · {t("fieldWorkflow.pendingPhotos")}: {pendingPhotos} ·{" "}
          {t("fieldWorkflow.pendingGps")}: {pendingGps} · {t("fieldWorkflow.pendingWorkday")}: {pendingWorkday}
        </Text>
        <Text style={styles.meta}>
          {t("fieldWorkflow.networkState")}: {online ? t("syncHealth.online") : t("syncHealth.offline")} ·{" "}
          {t("fieldWorkflow.syncState")}: {syncing ? t("fieldWorkflow.syncing") : syncPhase}
        </Text>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
        contentContainerStyle={[styles.list, !count && styles.listEmpty, { paddingBottom: stackBottom }]}
        ListEmptyComponent={
          <EmptyState
            icon="cloud-upload-outline"
            title={t("offlineSync.emptyTitle")}
            subtitle={t("offlineSync.emptyMessage")}
            action={t("offlineSync.emptyAction")}
            onAction={() => navigation.goBack()}
          />
        }
        renderItem={({ item }) => (
          <FlatCard style={styles.queueCard}>
            <View style={styles.rowTop}>
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.brand700} />
              <Text style={styles.name}>{item.values.farmer_name || "Farmer"}</Text>
            </View>
            <Text style={styles.queueMeta}>{formatDisplayDateTime(item.createdAt)}</Text>
            {item.lastError ? (
              <Text style={styles.queueWarn}>{t("offlineSync.uploadPending")}</Text>
            ) : null}
            <Text style={styles.queueMeta}>
              {t("offlineSync.attempts", { count: item.attempts })}
            </Text>
          </FlatCard>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  body: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm
  },
  hero: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg
  },
  cloudWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.pill,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  heroTitle: {
    color: Colors.text1,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  heroSub: {
    color: Colors.text3,
    fontSize: FontSize.md,
    lineHeight: 20,
    textAlign: "center"
  },
  meta: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
    textAlign: "center"
  },
  list: {
    gap: Spacing.sm,
    padding: Spacing.screen
  },
  listEmpty: {
    flexGrow: 1
  },
  queueCard: {
    gap: Spacing.xs
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm
  },
  name: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  queueMeta: {
    color: Colors.text3,
    fontSize: FontSize.md
  },
  queueWarn: {
    color: Colors.amberText,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium
  }
});
