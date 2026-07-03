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
  onSignIn: () => void;
};

/** Compact fingerprint login — secondary to password login. */
export function LoginBiometricSection({ status, ready, canLogin, busy, onSignIn }: Props) {
  if (!ready || !status.hardwareAvailable) {
    return null;
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
          accessibilityLabel="Login with fingerprint"
        >
          <View style={styles.iconChip}>
            <Ionicons name="finger-print-outline" size={22} color={GREEN} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{busy ? "Checking…" : "Login with fingerprint"}</Text>
            <Text style={styles.hint}>Use saved device login</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
        </TouchableOpacity>
      ) : (
        <View style={styles.setupRow}>
          <View style={styles.iconChip}>
            <Ionicons name="finger-print-outline" size={22} color={GREEN} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Login with fingerprint</Text>
            <Text style={styles.hint}>
              {status.enrolled
                ? "Sign in once with password to save device login."
                : "Set up fingerprint on your phone first."}
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
