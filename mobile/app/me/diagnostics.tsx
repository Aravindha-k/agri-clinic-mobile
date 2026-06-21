import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader, PrimaryButton } from "../../../src/components/ui";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useI18n } from "../../../src/i18n/I18nContext";
import { formatRelativeTimeLocalized } from "../../../src/i18n";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import { getGpsStateReport } from "../../../src/utils/gpsStateReport";
import { formatRelativeTime } from "../../../src/utils/formatRelativeTime";
import { ProductionApiDiagnosticsPanel } from "../../components/diagnostics/ProductionApiDiagnosticsPanel";
import { GpsHealthPanel } from "../../components/daySummary/GpsHealthPanel";
import { ScreenCanvas, ScreenEntranceBloom, BrandPageHeader } from "../../components/layout";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import {
  flushGpsBuffer,
  getBatteryPercent,
  getGpsBufferStatus,
  getLastBufferedPointTime,
  migrateLegacyGpsQueueIfNeeded
} from "../../lib/gps/trackingService";
import { useSyncStore } from "../../lib/store/syncStore";
import { Colors, FontSize, Spacing } from "../../lib/theme";

export default function DiagnosticsScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent()?.getParent();
  const { t, language } = useI18n();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const online = useConnectivityOnline();
  const { pendingCount, syncing, syncAll, lastSyncAt, refreshQueue } = useOfflineSync();
  const { isActive, lastSyncTime, refreshTracking } = useTracking();
  const pendingGpsCount = useSyncStore((state) => state.pendingGPSCount);
  const failedVisitsCount = useSyncStore((state) => state.failedVisitsCount);

  const [refreshing, setRefreshing] = useState(false);
  const entranceTick = useScreenEntrance();
  const [bufferStatus, setBufferStatus] = useState(getGpsBufferStatus());
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);
  const [gpsReport, setGpsReport] = useState<Awaited<ReturnType<typeof getGpsStateReport>> | null>(null);

  const pendingPoints = pendingGpsCount;

  const lastSyncLabel = useMemo(() => {
    const iso = bufferStatus.lastSyncAt || lastSyncTime || getLastBufferedPointTime();
    if (!iso) return t("daySummary.notSyncedYet");
    return formatRelativeTime(iso);
  }, [bufferStatus.lastSyncAt, lastSyncTime, t]);

  const loadDiagnostics = useCallback(async () => {
    await migrateLegacyGpsQueueIfNeeded();
    if (getGpsBufferStatus().pending > 0) {
      await flushGpsBuffer().catch(() => undefined);
    }
    setBufferStatus(getGpsBufferStatus());
    setBatteryPercent(await getBatteryPercent());
    setGpsReport(await getGpsStateReport());
    await refreshQueue().catch(() => undefined);
  }, [refreshQueue]);

  useFocusEffect(
    useCallback(() => {
      void loadDiagnostics();
      void refreshTracking().catch(() => undefined);
    }, [loadDiagnostics, refreshTracking])
  );

  useEffect(() => {
    const timer = setInterval(() => setBufferStatus(getGpsBufferStatus()), 5000);
    return () => clearInterval(timer);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadDiagnostics(), refreshTracking().catch(() => undefined)]);
    setRefreshing(false);
  }

  async function handleSyncAll() {
    try {
      await syncAll();
      await loadDiagnostics();
    } catch (err) {
      Alert.alert(t("common.syncFailed"), err instanceof Error ? err.message : t("common.tryAgain"));
    }
  }

  const lastSyncedLabel = lastSyncAt
    ? formatRelativeTimeLocalized(language, lastSyncAt)
    : t("common.never");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <ScreenEntranceBloom replayKey={entranceTick} />
      <BrandPageHeader showWordmark style={styles.brandHeader} />
      <AppHeader
        title={t("diagnostics.title")}
        subtitle={t("diagnostics.subtitle")}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabInset + Spacing.xl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} {...refreshControlProps} />
        }
      >
        <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
          <GpsHealthPanel
            title={t("daySummary.gpsHealth")}
            gpsActive={gpsReport?.gps_enabled ?? isActive}
            permissionStatus={gpsReport?.location_permission_status ?? null}
            backgroundTracking={gpsReport?.background_tracking_enabled ?? null}
            lastSyncLabel={lastSyncLabel}
            pendingPoints={pendingPoints}
            batteryPercent={batteryPercent}
            online={online}
          />
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)}>
          <ProductionApiDiagnosticsPanel />
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(2)}>
          <View style={styles.syncSection}>
          <Text style={styles.sectionTitle}>{t("profile.syncOffline")}</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t("profile.pendingVisits")}</Text>
            <Text style={styles.statValue}>{pendingCount}</Text>
          </View>
          {failedVisitsCount > 0 ? (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t("diagnostics.failedVisits")}</Text>
              <Text style={[styles.statValue, styles.statWarn]}>{failedVisitsCount}</Text>
            </View>
          ) : null}
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t("profile.pendingGps")}</Text>
            <Text style={styles.statValue}>{pendingPoints}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t("profile.lastSynced")}</Text>
            <Text style={styles.statValue}>{lastSyncedLabel}</Text>
          </View>

          <PrimaryButton
            title={syncing ? t("home.syncing") : t("profile.syncAllNow")}
            onPress={() => void handleSyncAll()}
            loading={syncing}
            disabled={pendingCount === 0}
            style={styles.syncBtn}
          />
          <PrimaryButton
            title={t("diagnostics.viewQueue")}
            variant="secondary"
            onPress={() => rootNav?.navigate("OfflineSync")}
            style={styles.queueBtn}
          />
        </View>
        </FadeInSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  brandHeader: {
    paddingTop: 0,
    zIndex: 2
  },
  scroll: {
    flex: 1
  },
  content: {
    gap: Spacing.md,
    paddingTop: Spacing.sm
  },
  syncSection: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md
  },
  sectionTitle: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  statRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  statLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  statValue: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: "600"
  },
  statWarn: {
    color: Colors.red
  },
  syncBtn: {
    marginTop: Spacing.sm
  },
  queueBtn: {
    marginTop: 0
  }
});
