import { StyleSheet, View } from "react-native";
import { AppFallbackScreen } from "../components/AppFallbackScreen";
import { ScreenLoader } from "../../mobile/components/layout/ScreenLoader";
import { Colors } from "../../mobile/lib/theme";
import { useAuth, type BootstrapIssue } from "../storage/AuthContext";
import { API_BASE_URL } from "../api/config";
import { getNetworkMessage, SERVER_MESSAGE } from "../utils/apiError";

function issueCopy(issue: BootstrapIssue) {
  if (issue === "network") {
    return { title: "Cannot reach server", message: getNetworkMessage() };
  }
  return { title: "Server unavailable", message: SERVER_MESSAGE };
}

/** Bootstrap error screen — manual retry when server validation fails (non-blocking at startup). */
export function StartupScreen() {
  const { sessionValidating, bootstrapIssue, retryBootstrap, resetLocalSession } = useAuth();

  if (sessionValidating || bootstrapIssue === "none") {
    return (
      <View style={styles.wait}>
        <ScreenLoader />
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
      secondaryLabel="Reset local session"
      onSecondary={() => {
        void resetLocalSession("startup error screen").catch(() => undefined);
      }}
    />
  );
}

const styles = StyleSheet.create({
  wait: {
    backgroundColor: Colors.bg,
    flex: 1
  }
});
