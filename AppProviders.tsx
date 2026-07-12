import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold
} from "@expo-google-fonts/inter";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Dimensions, LogBox, Platform, StatusBar as RNStatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import type { Metrics } from "react-native-safe-area-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { WebMobileFrame } from "./src/components/WebMobileFrame";
import { GpsComplianceShell } from "./src/components/GpsComplianceShell";
import { GpsWorkdayGate } from "./src/components/GpsWorkdayGate";
import { NotificationBridge } from "./src/components/NotificationBridge";
import { LanOfflineToast } from "./mobile/components/ui/LanOfflineToast";
import { ToastHost } from "./src/components/ui/ToastHost";
import { AuthProvider, useAuth } from "./src/storage/AuthContext";
import { EmployeeProvider } from "./src/storage/EmployeeContext";
import { FieldDataRefreshProvider } from "./src/storage/FieldDataRefreshContext";
import { MasterDataProvider } from "./src/storage/MasterDataContext";
import { OfflineSyncProvider } from "./src/storage/OfflineSyncContext";
import { AutomaticSyncProvider } from "./src/storage/AutomaticSyncProvider";
import { AppPreferencesProvider } from "./src/storage/AppPreferencesContext";
import { I18nProvider } from "./src/i18n/I18nContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { TrackingProvider } from "./src/storage/TrackingContext";
import { GpsComplianceProvider } from "./src/storage/GpsComplianceContext";
import { NotificationsProvider } from "./src/storage/NotificationsContext";
import { ToastProvider } from "./src/storage/ToastContext";
import { ThemeProvider } from "./src/theme";
import { applyGlobalFonts } from "./src/theme/applyGlobalFonts";
import { STATUS_BAR } from "./src/theme/globalStyles";
import {
  logReleaseStartupConstants,
  logStartup,
  patchStartupSnapshot
} from "./src/utils/startupDiagnostics";
import { applyAndroidChromeColors } from "./src/utils/androidChrome";

LogBox.ignoreLogs([
  /expo-notifications: Android Push notifications/i,
  /expo-notifications.*not fully supported in Expo Go/i
]);

const { width: winW, height: winH } = Dimensions.get("window");
const FALLBACK_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: winW, height: winH },
  insets: { top: 0, right: 0, bottom: 0, left: 0 }
};

function AppStatusBar() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={STATUS_BAR.backgroundColor} />
      {Platform.OS === "android" ? (
        <RNStatusBar barStyle={STATUS_BAR.barStyle} backgroundColor={STATUS_BAR.backgroundColor} />
      ) : null}
    </>
  );
}

function AppShell() {
  useEffect(() => {
    void applyAndroidChromeColors();
    logReleaseStartupConstants();
    logStartup("app_mount");
    void import("./src/tracking/registerBackgroundLocationTask").then(() => {
      logStartup("tracking_task_deferred");
    });
    void import("./src/tracking/registerBackgroundFieldSyncTask").then(() => {
      logStartup("tracking_task_deferred", "field_sync");
    });
    let cleanup: (() => void) | undefined;
    void import("./mobile/lib/offlineSyncManager").then((mod) => {
      cleanup = mod.initOfflineSync();
    });
    return () => cleanup?.();
  }, []);

  return (
    <>
      <AppStatusBar />
      <LanOfflineToast />
      <ToastHost />
      <RootNavigator />
    </>
  );
}

/** Fires once when critical local startup is done (fonts + auth restore) — not network APIs. */
function CriticalStartupGate({
  fontsLoaded,
  onCriticalReady
}: {
  fontsLoaded: boolean;
  onCriticalReady?: () => void;
}) {
  const { isReady } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || !onCriticalReady) return;
    if (!fontsLoaded || !isReady) return;
    firedRef.current = true;
    onCriticalReady();
  }, [fontsLoaded, isReady, onCriticalReady]);

  useEffect(() => {
    if (!onCriticalReady || firedRef.current) return;
    const timer = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      logStartup("providers_ready", "soft_timeout");
      onCriticalReady();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onCriticalReady]);

  return null;
}

type Props = {
  onShellReady?: () => void;
  onCriticalReady?: () => void;
};

export default function AppProviders({ onShellReady, onCriticalReady }: Props) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold
  });

  useEffect(() => {
    logStartup("fonts_loading");
    onShellReady?.();
    const timer = setTimeout(() => {
      if (!fontsLoaded) logStartup("fonts_timeout");
    }, 4000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, onShellReady]);

  useEffect(() => {
    if (fontsLoaded) {
      patchStartupSnapshot({ fontsLoaded: true });
      logStartup("fonts_ready");
      applyGlobalFonts();
    }
  }, [fontsLoaded]);

  return (
    <WebMobileFrame>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics ?? FALLBACK_METRICS}>
          <AppErrorBoundary>
            <ThemeProvider>
              <AuthProvider>
                <CriticalStartupGate fontsLoaded={fontsLoaded} onCriticalReady={onCriticalReady} />
                <FieldDataRefreshProvider>
                  <MasterDataProvider>
                    <EmployeeProvider>
                      <NotificationsProvider>
                        <AppPreferencesProvider>
                          <I18nProvider>
                            <OfflineSyncProvider>
                              <AutomaticSyncProvider>
                              <GpsComplianceProvider>
                                <TrackingProvider>
                                  <BottomSheetModalProvider>
                                    <ToastProvider>
                                      <NotificationBridge />
                                      <GpsComplianceShell>
                                        <GpsWorkdayGate>
                                          <AppShell />
                                        </GpsWorkdayGate>
                                      </GpsComplianceShell>
                                    </ToastProvider>
                                  </BottomSheetModalProvider>
                                </TrackingProvider>
                              </GpsComplianceProvider>
                              </AutomaticSyncProvider>
                            </OfflineSyncProvider>
                          </I18nProvider>
                        </AppPreferencesProvider>
                      </NotificationsProvider>
                    </EmployeeProvider>
                  </MasterDataProvider>
                </FieldDataRefreshProvider>
              </AuthProvider>
            </ThemeProvider>
          </AppErrorBoundary>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </WebMobileFrame>
  );
}
