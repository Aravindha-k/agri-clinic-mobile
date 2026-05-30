import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppFallbackScreen } from "../components/AppFallbackScreen";
import { PremiumIntroBackground } from "../components/auth/PremiumIntroBackground";
import { BRAND } from "../brand/constants";
import { useAuth, type BootstrapIssue } from "../storage/AuthContext";
import { NETWORK_MESSAGE, SERVER_MESSAGE } from "../utils/apiError";
import { AUTH_THEME } from "../theme/authTheme";

function issueCopy(issue: BootstrapIssue) {
  if (issue === "network") {
    return {
      title: "Connection problem",
      message: NETWORK_MESSAGE
    };
  }
  return {
    title: "Server unavailable",
    message: SERVER_MESSAGE
  };
}

/** Splash / startup retry while session is restored. */
export function BootstrapScreen() {
  const { authLoading, bootstrapIssue, retryBootstrap } = useAuth();

  if (!authLoading && bootstrapIssue !== "none") {
    const copy = issueCopy(bootstrapIssue);
    return (
      <AppFallbackScreen
        title={copy.title}
        message={`${copy.message} Your session is still saved.`}
        primaryLabel="Retry"
        onPrimary={() => {
          void retryBootstrap().catch(() => undefined);
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <PremiumIntroBackground variant="brand" />
      <ActivityIndicator size="small" color={AUTH_THEME.neon} />
      <Text style={styles.label}>{BRAND.appName}</Text>
      <Text style={styles.hint}>Restoring your session…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: AUTH_THEME.bg,
    flex: 1,
    gap: 12,
    justifyContent: "center"
  },
  label: {
    color: AUTH_THEME.text,
    fontSize: 16,
    fontWeight: "800"
  },
  hint: {
    color: AUTH_THEME.textMuted,
    fontSize: 13,
    fontWeight: "500"
  }
});
