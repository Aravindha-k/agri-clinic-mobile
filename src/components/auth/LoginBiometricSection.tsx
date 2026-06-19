import { useEffect } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { FONTS } from "../../theme/fonts";
import { Colors } from "../../../mobile/lib/theme";
import type { BiometricLoginStatus } from "../../storage/biometricLoginStorage";

type Props = {
  status: BiometricLoginStatus;
  ready: boolean;
  canLogin: boolean;
  busy: boolean;
  onSignIn: () => void;
};

export function LoginBiometricSection({ status, ready, canLogin, busy, onSignIn }: Props) {
  const ringScale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (!canLogin || busy) {
      ringScale.value = 1;
      iconScale.value = 1;
      return;
    }

    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [busy, canLogin, iconScale, ringScale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }]
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }]
  }));

  if (!ready || !status.hardwareAvailable) {
    return null;
  }

  const iconName =
    status.label === "Face ID" ? "scan-outline" : ("finger-print-outline" as const);

  return (
    <View style={styles.fill}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {canLogin ? (
        <>
          <Text style={styles.sectionTitle}>Quick sign-in</Text>
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={onSignIn}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Sign in with ${status.label}`}
          >
            <Reanimated.View style={[styles.biometricRing, ringStyle]}>
              <Reanimated.View style={[styles.biometricIconWrap, iconStyle]}>
                <Ionicons name={iconName} size={28} color={Colors.brand700} />
              </Reanimated.View>
            </Reanimated.View>
            <Text style={styles.biometricLabel}>
              {busy ? "Verifying…" : `Sign in with ${status.label}`}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.setupCard}>
          <View style={styles.setupIconWrap}>
            <Ionicons name={iconName} size={22} color={Colors.brand700} />
          </View>
          <Text style={styles.setupTitle}>Biometric sign-in</Text>
          <Text style={styles.setupHint}>
            {status.enrolled
              ? "Sign in with your password once to enable quick access next time."
              : `Set up ${status.label} on your device to use quick sign-in.`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flexGrow: 1,
    justifyContent: "flex-end",
    minHeight: 120,
    paddingTop: 8
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  dividerLine: {
    backgroundColor: "rgba(47,56,48,0.12)",
    flex: 1,
    height: 1
  },
  dividerText: {
    color: "rgba(75,85,76,0.65)",
    fontFamily: FONTS.medium,
    fontSize: 11
  },
  sectionTitle: {
    color: "#2F3830",
    fontFamily: FONTS.semibold,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center"
  },
  biometricBtn: {
    alignItems: "center",
    gap: 10
  },
  biometricRing: {
    alignItems: "center",
    backgroundColor: "rgba(15,107,67,0.08)",
    borderColor: "rgba(15,107,67,0.18)",
    borderRadius: 44,
    borderWidth: 1,
    height: 88,
    justifyContent: "center",
    width: 88
  },
  biometricIconWrap: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
    ...Platform.select({
      ios: {
        shadowColor: "#0f1a14",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6
      },
      default: { elevation: 2 }
    })
  },
  biometricLabel: {
    color: Colors.brand700,
    fontFamily: FONTS.semibold,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center"
  },
  setupCard: {
    alignItems: "center",
    backgroundColor: "rgba(15,107,67,0.05)",
    borderColor: "rgba(47,81,50,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  setupIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(15,107,67,0.1)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    marginBottom: 2,
    width: 44
  },
  setupTitle: {
    color: "#2F3830",
    fontFamily: FONTS.semibold,
    fontSize: 13,
    fontWeight: "600"
  },
  setupHint: {
    color: "rgba(75,85,76,0.85)",
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center"
  }
});
