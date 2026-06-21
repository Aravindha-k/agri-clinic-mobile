import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppFallbackScreen } from "./AppFallbackScreen";
import { getStartupSnapshot } from "../utils/startupDiagnostics";

type Props = {
  onContinueToLogin: () => void;
  onRetry?: () => void;
};

/** Shown when splash/auth bootstrap exceeds the startup deadline (release APK). */
export function StartupStuckScreen({ onContinueToLogin, onRetry }: Props) {
  const snap = getStartupSnapshot();

  const statusLines = [
    `Release: ${snap.releaseMode ? "yes" : "no"}`,
    `API: ${snap.apiBaseUrl}`,
    `Auth loading: ${snap.authLoading === null ? "?" : snap.authLoading ? "yes" : "no"}`,
    `Auth ready: ${snap.isReady === null ? "?" : snap.isReady ? "yes" : "no"}`,
    `Bootstrap: ${snap.bootstrapIssue ?? "none"}`,
    `Last phase: ${snap.lastPhase ?? "unknown"}`
  ].join("\n");

  return (
    <View style={styles.root}>
      <AppFallbackScreen
        title="Startup issue detected"
        message={`The app is taking longer than expected to start.\n\n${statusLines}`}
        primaryLabel="Continue to login"
        onPrimary={onContinueToLogin}
        secondaryLabel={onRetry ? "Retry" : undefined}
        onSecondary={onRetry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
