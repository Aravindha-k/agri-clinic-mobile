import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AppFallbackScreen } from "../components/AppFallbackScreen";
import { ScreenLoader } from "../../mobile/components/layout/ScreenLoader";
import { Colors } from "../../mobile/lib/theme";
import { useAuth, type BootstrapIssue } from "../storage/AuthContext";
import { API_BASE_URL } from "../api/config";
import { getNetworkMessage, SERVER_MESSAGE } from "../utils/apiError";
import { useI18n } from "../i18n/I18nContext";
import { markContinueOffline, clearContinueOffline } from "../bootstrap/startupCoordinator";

function issueCopy(issue: BootstrapIssue, t: (key: string) => string) {
  if (issue === "network") {
    return { title: t("startup.cannotReachServer"), message: getNetworkMessage() };
  }
  return { title: t("startup.serverUnavailable"), message: SERVER_MESSAGE };
}

/**
 * Recoverable startup surface — Retry / Continue Offline / Sign Out.
 * No stack traces. Diagnostics remain on the Diagnostics screen only.
 */
export function StartupScreen({
  startupTimedOut = false,
  onContinueOffline
}: {
  startupTimedOut?: boolean;
  onContinueOffline?: () => void;
}) {
  const { sessionValidating, bootstrapIssue, retryBootstrap, resetLocalSession } = useAuth();
  const { t } = useI18n();
  const [retrying, setRetrying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  if (!startupTimedOut && (sessionValidating || bootstrapIssue === "none")) {
    return (
      <View style={styles.wait}>
        <ScreenLoader />
      </View>
    );
  }

  const copy = startupTimedOut
    ? {
        title: t("startup.recoveryTitle"),
        message: t("startup.recoveryBody")
      }
    : issueCopy(bootstrapIssue, t);
  const devApiHint = __DEV__ ? `\n\nAPI: ${API_BASE_URL}` : "";

  return (
    <View style={startupTimedOut ? styles.recovery : styles.wait}>
      <AppFallbackScreen
        title={copy.title}
        message={`${copy.message}${startupTimedOut ? "" : ` ${t("startup.sessionStillSaved")}`}${devApiHint}`}
        primaryLabel={retrying ? t("startup.retrying") : t("common.retry")}
        onPrimary={() => {
          if (retrying) return;
          clearContinueOffline();
          setRetrying(true);
          void retryBootstrap()
            .catch(() => undefined)
            .finally(() => setRetrying(false));
        }}
        secondaryLabel={t("startup.continueOffline")}
        onSecondary={() => {
          markContinueOffline("startup_recovery");
          setDismissed(true);
          onContinueOffline?.();
        }}
        tertiaryLabel={t("startup.resetSession")}
        onTertiary={() => {
          void resetLocalSession("startup recovery sign out").catch(() => undefined);
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
