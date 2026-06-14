import "./src/tracking/registerBackgroundLocationTask";
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
import { useEffect } from "react";
import { Dimensions, Platform, StatusBar as RNStatusBar } from "react-native";
import { initOfflineSync } from "./mobile/lib/offlineSyncManager";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import type { Metrics } from "react-native-safe-area-context";
import { AuthProvider } from "./src/storage/AuthContext";
import { EmployeeProvider } from "./src/storage/EmployeeContext";
import { FieldDataRefreshProvider } from "./src/storage/FieldDataRefreshContext";
import { MasterDataProvider } from "./src/storage/MasterDataContext";
import { OfflineSyncProvider } from "./src/storage/OfflineSyncContext";
import { AppPreferencesProvider } from "./src/storage/AppPreferencesContext";
import { I18nProvider } from "./src/i18n/I18nContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { TrackingProvider } from "./src/storage/TrackingContext";
import { GpsComplianceProvider } from "./src/storage/GpsComplianceContext";
import { GpsComplianceShell } from "./src/components/GpsComplianceShell";
import { GpsWorkdayGate } from "./src/components/GpsWorkdayGate";
import { WorkdayInactiveBanner } from "./src/components/WorkdayInactiveBanner";
import { NotificationBridge } from "./src/components/NotificationBridge";
import { NotificationsProvider } from "./src/storage/NotificationsContext";
import { LanOfflineToast } from "./mobile/components/ui/LanOfflineToast";
import { ThemeProvider } from "./src/theme";
import { applyGlobalFonts } from "./src/theme/applyGlobalFonts";
import { STATUS_BAR } from "./src/theme/globalStyles";

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
        <RNStatusBar
          barStyle={STATUS_BAR.barStyle}
          backgroundColor={STATUS_BAR.backgroundColor}
        />
      ) : null}
    </>
  );
}

function AppShell() {
  useEffect(() => {
    return initOfflineSync();
  }, []);

  return (
    <>
      <AppStatusBar />
      <LanOfflineToast />
      <RootNavigator />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold
  });

  useEffect(() => {
    if (fontsLoaded) {
      applyGlobalFonts();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics ?? FALLBACK_METRICS}>
        <AppErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <FieldDataRefreshProvider>
                <MasterDataProvider>
                  <EmployeeProvider>
                    <NotificationsProvider>
                      <AppPreferencesProvider>
                        <I18nProvider>
                          <OfflineSyncProvider>
                            <GpsComplianceProvider>
                              <TrackingProvider>
                                <BottomSheetModalProvider>
                                  <NotificationBridge />
                                  <GpsComplianceShell>
                                    <WorkdayInactiveBanner />
                                    <GpsWorkdayGate>
                                      <AppShell />
                                    </GpsWorkdayGate>
                                  </GpsComplianceShell>
                                </BottomSheetModalProvider>
                              </TrackingProvider>
                            </GpsComplianceProvider>
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
  );
}
