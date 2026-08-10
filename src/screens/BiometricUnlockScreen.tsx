import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo } from "../components/brand/CompanyLogo";
import { hasSplashUiReady, onSplashUiReady } from "../bootstrap/splashUiGate";
import { useAuth } from "../storage/AuthContext";
import { Colors, FontSize, Spacing } from "../../mobile/lib/theme";
import { FONTS } from "../theme/fonts";
import type { BiometricUnlockOutcome } from "../storage/biometricLoginStorage";

const PRIMARY = Colors.brand700;

function messageForOutcome(outcome: BiometricUnlockOutcome | null): string {
  switch (outcome) {
    case "user_cancel":
      return "Unlock cancelled. Try again or use your password.";
    case "authentication_failed":
      return "Fingerprint did not match. Try again.";
    case "lockout":
      return "Too many attempts. Wait a moment or use your password.";
    case "timeout":
      return "Fingerprint prompt timed out. Try again.";
    case "prompt_busy":
      return "Fingerprint prompt is already open.";
    case "network_error":
    case "server_error":
      return "Couldn’t reach the server. Check your connection and try fingerprint again.";
    case "token_refresh_failed":
    case "no_refresh_token":
      return "Couldn’t restore your session. Try fingerprint again or sign in with your password.";
    case "reauth_material_missing":
    case "reauth_material_invalid":
      return "Sign in with your password once to reconnect fingerprint unlock.";
    case "session_replaced":
      return "Signed in on another device. Please sign in again.";
    default:
      return "Unlock with your fingerprint to continue.";
  }
}

/**
 * Branded gate while authPhase is locked / authenticating_biometric.
 * Does not mount Home, Duty, or tracking.
 * Never auto-prompts until splash UI is ready (OS dialog ignores React opacity).
 */
export function BiometricUnlockScreen() {
  const insets = useSafeAreaInsets();
  const { attemptBiometricUnlock, completeBiometricUnlock, choosePasswordLogin, authPhase } =
    useAuth();
  const [busy, setBusy] = useState(false);
  const [splashReady, setSplashReady] = useState(hasSplashUiReady);
  const [lastOutcome, setLastOutcome] = useState<BiometricUnlockOutcome | null>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => onSplashUiReady(() => setSplashReady(true)), []);

  const runUnlock = useCallback(async () => {
    if (busy || !hasSplashUiReady()) return;
    setBusy(true);
    setLastOutcome(null);
    try {
      const result = await attemptBiometricUnlock();
      if (!result.ok) {
        setLastOutcome(result.outcome);
        return;
      }
      // Re-login already bootstrapped inside attemptBiometricUnlock with biometric_lock UI.
      // App-lock refresh path still needs completeBiometricUnlock.
      if (result.action !== "reauthenticate_expired_session") {
        await completeBiometricUnlock();
      }
    } catch (err) {
      setLastOutcome("token_refresh_failed");
      // eslint-disable-next-line no-console
      console.log("[Biometric] unlock_screen_error", {
        message: err instanceof Error ? err.message : "unknown"
      });
    } finally {
      setBusy(false);
    }
  }, [attemptBiometricUnlock, busy, completeBiometricUnlock]);

  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!splashReady) return;
    if (authPhase !== "locked") return;
    autoStartedRef.current = true;
    void runUnlock();
  }, [authPhase, runUnlock, splashReady]);

  const validating = authPhase === "validating_session" || (busy && lastOutcome === null);
  const waitingForSplash = !splashReady;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <CompanyLogo size={96} />
      <Text style={styles.title}>Unlock workspace</Text>
      <Text style={styles.subtitle}>
        {waitingForSplash ? "Preparing…" : messageForOutcome(lastOutcome)}
      </Text>

      {validating || waitingForSplash ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: Spacing.lg }} />
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy || waitingForSplash}
          onPress={() => void runUnlock()}
          style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}
        >
          <Text style={styles.primaryBtnText}>Try fingerprint again</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy || waitingForSplash}
          onPress={choosePasswordLogin}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryBtnText}>Use password</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    paddingHorizontal: Spacing.xl
  },
  title: {
    marginTop: Spacing.lg,
    fontFamily: FONTS.semibold,
    fontSize: FontSize.xl,
    color: Colors.text1,
    textAlign: "center"
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontFamily: FONTS.regular,
    fontSize: FontSize.md,
    color: Colors.text3,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320
  },
  actions: {
    marginTop: "auto",
    width: "100%",
    gap: Spacing.sm
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  primaryBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: FontSize.md,
    color: Colors.onPrimary
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border
  },
  secondaryBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: FontSize.md,
    color: Colors.text1
  },
  pressed: {
    opacity: 0.85
  }
});
