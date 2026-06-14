import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppFallbackScreen } from "../components/AppFallbackScreen";
import { BRAND, BRAND_COLORS } from "../config/brand";
import { useAuth, type BootstrapIssue } from "../storage/AuthContext";
import { API_BASE_URL } from "../api/config";
import { getNetworkMessage, SERVER_MESSAGE } from "../utils/apiError";

function issueCopy(issue: BootstrapIssue) {
  if (issue === "network") {
    return { title: "Cannot reach server", message: getNetworkMessage() };
  }
  return { title: "Server unavailable", message: SERVER_MESSAGE };
}

/** Bootstrap error screen — shown after intro when session restore fails. */
export function StartupScreen() {
  const { authLoading, bootstrapIssue, retryBootstrap } = useAuth();

  if (authLoading || bootstrapIssue === "none") {
    return (
      <View style={styles.wait}>
        <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
        <Text style={styles.waitText}>Checking connection…</Text>
      </View>
    );
  }

  const copy = issueCopy(bootstrapIssue);
  const devApiHint = __DEV__ ? `\n\nAPI: ${API_BASE_URL}` : "";
  return (
    <AppFallbackScreen
      title={copy.title}
      message={`${copy.message} Your session is still saved.${devApiHint}`}
      primaryLabel="Retry"
      onPrimary={() => {
        void retryBootstrap().catch(() => undefined);
      }}
    />
  );
}

const styles = StyleSheet.create({
  wait: {
    alignItems: "center",
    backgroundColor: "#FAFCFB",
    flex: 1,
    gap: 12,
    justifyContent: "center"
  },
  waitText: {
    color: "#5C6B63",
    fontSize: 14,
    fontWeight: "600"
  }
});
