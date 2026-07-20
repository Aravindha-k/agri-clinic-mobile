import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../theme/fonts";
import { Spacing } from "../../../mobile/lib/theme";
import type { BiometricLoginStatus } from "../../storage/biometricLoginStorage";

const GREEN = "#0B6B3A";
const TEXT_MAIN = "#172B1A";
const TEXT_MUTED = "#6B7668";
const BORDER = "#E5E0D6";

type Props = {
  status: BiometricLoginStatus;
  ready: boolean;
  canLogin: boolean;
  busy: boolean;
  /** Session-expired professional layout — fingerprint primary. */
  sessionExpired?: boolean;
  onSignIn: () => void;
};

/** Fingerprint login — primary on session expiry, secondary otherwise. */
export function LoginBiometricSection({
  status,
  ready,
  canLogin,
  busy,
  sessionExpired = false,
  onSignIn
}: Props) {
  if (!ready || !status.hardwareAvailable) {
    return null;
  }

  if (sessionExpired && canLogin) {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onSignIn}
          disabled={busy}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Unlock with Fingerprint"
        >
          <Ionicons name="finger-print-outline" size={22} color="#FFFFFF" />
          <Text style={styles.primaryText}>{busy ? "Checking…" : "Unlock with Fingerprint"}</Text>
        </TouchableOpacity>
        <Text style={styles.orHint}>or sign in with your password below</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {canLogin ? (
        <TouchableOpacity
          style={styles.compactBtn}
          onPress={onSignIn}
          disabled={busy}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Unlock with Fingerprint"
        >
          <View style={styles.iconChip}>
            <Ionicons name="finger-print-outline" size={22} color={GREEN} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{busy ? "Checking…" : "Unlock with Fingerprint"}</Text>
            <Text style={styles.hint}>
              {status.enabled
                ? status.reauthMaterialReady
                  ? "Continue with fingerprint on this device"
                  : "Unlock with fingerprint on this device"
                : "Use saved device login"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
        </TouchableOpacity>
      ) : (
        <View style={styles.setupRow}>
          <View style={styles.iconChip}>
            <Ionicons name="finger-print-outline" size={22} color={GREEN} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>
              {status.enabled ? "Fingerprint ready" : "Unlock with Fingerprint"}
            </Text>
            <Text style={styles.hint}>
              {!status.enrolled
                ? "Set up fingerprint on your phone first."
                : status.enabled && !status.reauthMaterialReady
                  ? "Sign in with password once to reconnect fingerprint."
                  : status.enabled
                    ? "Fingerprint is unavailable. Sign in with your password."
                    : "Sign in once with password to save fingerprint login."}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.sm
  },
  primaryBtn: {
    alignItems: "center",
    backgroundColor: GREEN,
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  primaryText: {
    color: "#FFFFFF",
    fontFamily: FONTS.semibold,
    fontSize: 16,
    fontWeight: "700"
  },
  orHint: {
    color: TEXT_MUTED,
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: Spacing.sm,
    textAlign: "center"
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md
  },
  dividerLine: {
    backgroundColor: BORDER,
    flex: 1,
    height: StyleSheet.hairlineWidth
  },
  dividerText: {
    color: TEXT_MUTED,
    fontFamily: FONTS.regular,
    fontSize: 12
  },
  compactBtn: {
    alignItems: "center",
    backgroundColor: "#FAFAF7",
    borderColor: BORDER,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  setupRow: {
    alignItems: "center",
    backgroundColor: "#FAFAF7",
    borderColor: BORDER,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  iconChip: {
    alignItems: "center",
    backgroundColor: "#ECF8F0",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  copy: {
    flex: 1
  },
  title: {
    color: TEXT_MAIN,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    fontWeight: "600"
  },
  hint: {
    color: TEXT_MUTED,
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2
  }
});
