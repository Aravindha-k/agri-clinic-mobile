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
import { useEffect, useRef, useState } from "react";
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
import { StartupScreen } from "./src/screens/StartupScreen";
import { TrackingProvider } from "./src/storage/TrackingContext";
import { DutyProvider } from "./src/features/duty/store/DutyContext";
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
import {
  STARTUP_TIMEOUTS,
  markFontsLoaded,
  markStartupBegin,
  markStartupFailed
} from "./src/bootstrap/startupCoordinator";

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
  fontsReady,
  onCriticalReady
}: {
  fontsReady: boolean;
  onCriticalReady?: () => void;
}) {
  const { isReady } = useAuth();
  const firedRef = useRef(false);
  const [timedOut, setTimedOut] = useState(false);
  const [offlineContinued, setOfflineContinued] = useState(false);

  useEffect(() => {
    if (!fontsReady || !isReady) return;
    setTimedOut(false);
    if (!firedRef.current && onCriticalReady) {
      firedRef.current = true;
      onCriticalReady();
    }
  }, [fontsReady, isReady, onCriticalReady]);

  useEffect(() => {
    if (fontsReady && isReady) return;
    const timer = setTimeout(() => {
      if (__DEV__) {
        // Slow fonts/auth in Expo Go / Metro must not become a fatal startup screen.
        console.warn(
          "[Startup] critical_gate_slow — fonts/auth still pending (dev; keeping branded splash, not fatal)"
        );
        logStartup("waiting_for_metro_bundle", "critical_gate_dev_soft");
        return;
      }
      setTimedOut(true);
      logStartup("auth_bootstrap_timeout", "critical startup watchdog");
      markStartupFailed("critical_gate", "fonts_or_auth_timeout");
      if (!firedRef.current && onCriticalReady) {
        firedRef.current = true;
        onCriticalReady();
      }
    }, STARTUP_TIMEOUTS.criticalBootstrapMs);
    return () => clearTimeout(timer);
  }, [fontsReady, isReady, onCriticalReady]);

  if (offlineContinued) return null;
  return timedOut ? (
    <StartupScreen startupTimedOut onContinueOffline={() => setOfflineContinued(true)} />
  ) : null;
}

type Props = {
  onShellReady?: () => void;
  onCriticalReady?: () => void;
  onFatalError?: (error: unknown) => void;
};

export default function AppProviders({ onShellReady, onCriticalReady, onFatalError }: Props) {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold
  });
  const [fontsForced, setFontsForced] = useState(false);
  const fontsReady = fontsLoaded || fontError != null || fontsForced;
  const shellReadyFired = useRef(false);

  useEffect(() => {
    markStartupBegin("AppProviders");
    logStartup("fonts_loading");
    if (!shellReadyFired.current) {
      shellReadyFired.current = true;
      onShellReady?.();
    }
    const timer = setTimeout(() => {
      if (!fontsLoaded && fontError == null) {
        logStartup("fonts_timeout");
        setFontsForced(true);
        markFontsLoaded("forced_after_timeout");
      }
    }, STARTUP_TIMEOUTS.fontsMs);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError, onShellReady]);

  useEffect(() => {
    if (fontsLoaded) {
      patchStartupSnapshot({ fontsLoaded: true });
      logStartup("fonts_ready");
      markFontsLoaded();
      applyGlobalFonts();
    }
  }, [fontsLoaded]);

  return (
    <WebMobileFrame>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics ?? FALLBACK_METRICS}>
          <AppErrorBoundary onError={onFatalError}>
            <ThemeProvider>
              <AuthProvider>
                <FieldDataRefreshProvider>
                  <MasterDataProvider>
                    <EmployeeProvider>
                      <NotificationsProvider>
                        <AppPreferencesProvider>
                          <I18nProvider>
                            <CriticalStartupGate
                              fontsReady={fontsReady}
                              onCriticalReady={onCriticalReady}
                            />
                            <OfflineSyncProvider>
                              <AutomaticSyncProvider>
                              <GpsComplianceProvider>
                                <DutyProvider>
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
                                </DutyProvider>
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
