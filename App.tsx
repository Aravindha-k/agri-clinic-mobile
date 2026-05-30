import { StatusBar } from "expo-status-bar";
import { Dimensions } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import type { Metrics } from "react-native-safe-area-context";
import { AuthProvider } from "./src/storage/AuthContext";
import { EmployeeProvider } from "./src/storage/EmployeeContext";
import { FieldDataRefreshProvider } from "./src/storage/FieldDataRefreshContext";
import { OfflineSyncProvider } from "./src/storage/OfflineSyncContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { TrackingProvider } from "./src/storage/TrackingContext";
import { GpsComplianceProvider } from "./src/storage/GpsComplianceContext";
import { GpsComplianceShell } from "./src/components/GpsComplianceShell";
import { GpsWorkdayGate } from "./src/components/GpsWorkdayGate";
import { WorkdayInactiveBanner } from "./src/components/WorkdayInactiveBanner";
import { useAppSplash } from "./src/hooks/useAppSplash";
import { ThemeProvider, useTheme } from "./src/theme";

const { width: winW, height: winH } = Dimensions.get("window");
const FALLBACK_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: winW, height: winH },
  insets: { top: 0, right: 0, bottom: 0, left: 0 }
};

function AppShell() {
  const { isDark } = useTheme();
  useAppSplash();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? FALLBACK_METRICS}>
      <AppErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <FieldDataRefreshProvider>
              <EmployeeProvider>
                <OfflineSyncProvider>
                  <GpsComplianceProvider>
                    <TrackingProvider>
                      <GpsComplianceShell>
                        <WorkdayInactiveBanner />
                        <GpsWorkdayGate>
                          <AppShell />
                        </GpsWorkdayGate>
                      </GpsComplianceShell>
                    </TrackingProvider>
                  </GpsComplianceProvider>
                </OfflineSyncProvider>
              </EmployeeProvider>
            </FieldDataRefreshProvider>
          </AuthProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
