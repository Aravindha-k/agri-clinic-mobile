import { ReactNode, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useAuth } from "../storage/AuthContext";
import { useTrackingHealthOptional } from "../storage/TrackingHealthContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../mobile/lib/theme";

/**
 * Blocks field-work UI while an active workday lacks healthy location/tracking.
 * Auto-closes after successful recovery. Settings only on explicit permanent-denial tap.
 */
export function GpsWorkdayGate({ children }: { children: ReactNode }) {
  const healthCtx = useTrackingHealthOptional();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const onPrimary = useCallback(async () => {
    if (!healthCtx || busy) return;
    setBusy(true);
    try {
      if (healthCtx.primaryAction === "open_settings") {
        await healthCtx.openSettingsExplicit();
        return;
      }
      await healthCtx.recover();
    } finally {
      setBusy(false);
    }
  }, [busy, healthCtx]);

  const onCheckAgain = useCallback(async () => {
    if (!healthCtx || busy) return;
    setBusy(true);
    try {
      const next = await healthCtx.refreshHealth();
      if (next.status !== "healthy" && next.status !== "idle" && next.status !== "recovering") {
        await healthCtx.recover();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, healthCtx]);

  const primaryLabel = (() => {
    switch (healthCtx?.primaryAction) {
      case "allow_location":
        return "Allow Location";
      case "turn_on_location":
        return "Turn On Location";
      case "resume_tracking":
        return "Resume Tracking";
      case "open_settings":
        return "Open Settings";
      case "check_again":
        return "Check Again";
      default:
        return "Check Again";
    }
  })();

  const blocking = Boolean(healthCtx?.isBlocking);
  const subtitle =
    healthCtx?.health.status === "permission_permanently_denied"
      ? healthCtx.copy.permissionPermanent
      : healthCtx?.copy.subtitle ?? "";

  return (
    <View style={styles.flex}>
      {children}
      <Modal visible={blocking} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.backdrop} accessibilityViewIsModal>
          <View style={styles.card}>
            <Text style={styles.title}>{healthCtx?.copy.title}</Text>
            <Text style={styles.body}>{subtitle}</Text>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void onPrimary()}
              style={[styles.primary, busy && styles.disabled]}
            >
              {busy || healthCtx?.health.status === "recovering" ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              )}
            </Pressable>

            {healthCtx?.primaryAction !== "check_again" ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void onCheckAgain()}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Check Again</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void signOut()}
              style={styles.logout}
            >
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 18, 0.72)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    gap: Spacing.md,
    maxWidth: 420,
    padding: Spacing.xl,
    width: "100%"
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  body: {
    color: Colors.text3,
    fontSize: FontSize.body,
    lineHeight: 22,
    textAlign: "center"
  },
  primary: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: Radius.button,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.lg
  },
  primaryText: {
    color: Colors.onPrimary,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  },
  secondary: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center"
  },
  secondaryText: {
    color: Colors.brand700,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  },
  logout: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
    marginTop: Spacing.sm
  },
  logoutText: {
    color: Colors.text3,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  },
  disabled: { opacity: 0.7 }
});
