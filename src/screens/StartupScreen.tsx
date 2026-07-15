import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AppFallbackScreen } from "../components/AppFallbackScreen";
import { ScreenLoader } from "../../mobile/components/layout/ScreenLoader";
import { Colors } from "../../mobile/lib/theme";
import { useAuth, type BootstrapIssue } from "../storage/AuthContext";
import { API_BASE_URL } from "../api/config";
import { getNetworkMessage, SERVER_MESSAGE } from "../utils/apiError";
import { useI18n } from "../i18n/I18nContext";

function issueCopy(issue: BootstrapIssue) {
  if (issue === "network") {
    return { title: "Cannot reach server", message: getNetworkMessage() };
  }
  return { title: "Server unavailable", message: SERVER_MESSAGE };
}

/** Bootstrap error screen — manual retry when server validation fails (non-blocking at startup). */
export function StartupScreen({ startupTimedOut = false }: { startupTimedOut?: boolean }) {
  const { sessionValidating, bootstrapIssue, retryBootstrap, resetLocalSession } = useAuth();
  const { t } = useI18n();
  const [retrying, setRetrying] = useState(false);

  if (!startupTimedOut && (sessionValidating || bootstrapIssue === "none")) {
    return (
      <View style={styles.wait}>
        <ScreenLoader />
      </View>
    );
  }

  const copy = startupTimedOut
    ? {
        title: t("startup.takingLonger"),
        message: t("startup.offlineSafeMessage")
      }
    : issueCopy(bootstrapIssue);
  const devApiHint = __DEV__ ? `\n\nAPI: ${API_BASE_URL}` : "";
  return (
    <View style={startupTimedOut ? styles.recovery : styles.wait}>
      <AppFallbackScreen
        title={copy.title}
        message={`${copy.message}${startupTimedOut ? "" : " Your session is still saved."}${devApiHint}`}
        primaryLabel={retrying ? t("startup.retrying") : t("common.retry")}
        onPrimary={() => {
          if (retrying) return;
          setRetrying(true);
          void retryBootstrap()
            .catch(() => undefined)
            .finally(() => setRetrying(false));
        }}
        secondaryLabel={t("startup.resetSession")}
        onSecondary={() => {
          void resetLocalSession("startup error screen").catch(() => undefined);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wait: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  recovery: {
    ...StyleSheet.absoluteFillObject,
    elevation: Platform.OS === "android" ? 900 : 0,
    zIndex: 900
  }
});
