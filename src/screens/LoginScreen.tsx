import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoginBiometricSection } from "../components/auth/LoginBiometricSection";
import { LoginHeroHeader, LOGIN_HEADER_OVERLAP } from "../components/auth/LoginHeroHeader";
import { LoginPageFooter } from "../components/auth/LoginPageFooter";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useAuth } from "../storage/AuthContext";
import {
  canUseBiometricLogin,
  clearBiometricLogin,
  getBiometricLoginStatus,
  unlockSessionWithBiometrics,
  type BiometricLoginStatus
} from "../storage/biometricLoginStorage";
import { FONTS } from "../theme/fonts";
import { Colors, Enterprise, FontSize, FontWeight, Layout, Radius, Shadow, Spacing } from "../../mobile/lib/theme";
import { ProductionApiDiagnosticsPanel } from "../../mobile/components/diagnostics/ProductionApiDiagnosticsPanel";
import { TechnicalDetailsCollapsible } from "../../mobile/components/layout";
import { ApiRequestError, getNetworkMessage, isNetworkError } from "../utils/apiError";

const CARD_TOP_RADIUS = 24;
const CARD_PAD = 24;
const INPUT_H = 52;
const BTN_H = 52;

const EMPTY_BIOMETRIC_STATUS: BiometricLoginStatus = {
  hardwareAvailable: false,
  enrolled: false,
  enabled: false,
  label: "Biometrics"
};

export function LoginScreen() {
  useSecureScreen();
  const insets = useSafeAreaInsets();
  const { signIn, loginNotice, clearLoginNotice, retryBootstrap } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [focusedField, setFocusedField] = useState<"empId" | "password" | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<BiometricLoginStatus>(EMPTY_BIOMETRIC_STATUS);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricCanLogin, setBiometricCanLogin] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const refreshBiometricState = useCallback(async () => {
    const [status, canLogin] = await Promise.all([getBiometricLoginStatus(), canUseBiometricLogin()]);
    setBiometricStatus(status);
    setBiometricCanLogin(canLogin);
    setBiometricReady(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshBiometricState();
    }, [refreshBiometricState])
  );

  useEffect(() => {
    if (loginNotice) {
      setLoginError(loginNotice);
      clearLoginNotice();
    }
  }, [clearLoginNotice, loginNotice]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function handleFieldFocus(field: "empId" | "password") {
    setFocusedField(field);
    if (field === "password") {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 56, animated: true });
      });
    }
  }

  async function handleLogin() {
    const user = empId.trim();
    if (!user || !password.trim()) {
      setLoginError("Enter your Employee ID and password.");
      return;
    }

    setLoading(true);
    setLoginError("");

    try {
      await signIn(user, password);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "INVALID_CREDENTIALS") {
        setLoginError(error.message || "Please check your ID and password.");
      } else if (isNetworkError(error)) {
        setLoginError(getNetworkMessage());
      } else {
        setLoginError(error instanceof Error ? error.message : "Please check your ID and password.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    if (biometricBusy || loading) {
      return;
    }

    setBiometricBusy(true);
    setLoginError("");

    try {
      const unlocked = await unlockSessionWithBiometrics();
      if (!unlocked) {
        setLoginError("Biometric unlock was cancelled or is unavailable. Use your password.");
        await refreshBiometricState();
        return;
      }
      await retryBootstrap();
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === "SESSION_EXPIRED" ||
          error.code === "ACCOUNT_DISABLED" ||
          error.status === 403)
      ) {
        await clearBiometricLogin();
        await refreshBiometricState();
        setLoginError(
          error.code === "ACCOUNT_DISABLED" || error.status === 403
            ? "Your account is currently disabled. Please contact your administrator."
            : "Saved session expired. Use your password."
        );
      } else if (isNetworkError(error)) {
        setLoginError(getNetworkMessage());
      } else {
        setLoginError(error instanceof Error ? error.message : "Biometric unlock failed.");
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <LoginHeroHeader topInset={insets.top} />

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={keyboardOpen}
        >
          <View style={styles.card}>
            <View style={styles.loginTitleRow}>
              <Ionicons name="person-circle-outline" size={24} color={Colors.brand700} />
              <Text style={styles.loginTitle}>Login</Text>
            </View>
            <Text style={styles.loginSub}>Enter your Employee ID and password</Text>

            {loginError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.redText} />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {loginError ? (
              <TechnicalDetailsCollapsible>
                <ProductionApiDiagnosticsPanel compact />
              </TechnicalDetailsCollapsible>
            ) : null}

            <Text style={styles.fieldLabel}>Employee ID</Text>
            <View
              style={[
                styles.inputBox,
                focusedField === "empId" && styles.inputBoxFocused,
                loading && styles.inputDisabled
              ]}
            >
              <Ionicons name="person-outline" size={18} color={Colors.text3} style={styles.inputIcon} />
              <TextInput
                value={empId}
                onChangeText={(t) => {
                  setEmpId(t);
                  if (loginError) setLoginError("");
                }}
                onFocus={() => handleFieldFocus("empId")}
                onBlur={() => setFocusedField((f) => (f === "empId" ? null : f))}
                placeholder="Example: AG-8821"
                placeholderTextColor={Colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.fieldLabel}>Password</Text>
            <View
              style={[
                styles.inputBox,
                focusedField === "password" && styles.inputBoxFocused,
                loading && styles.inputDisabled
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color={Colors.text3} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (loginError) setLoginError("");
                }}
                onFocus={() => handleFieldFocus("password")}
                onBlur={() => setFocusedField((f) => (f === "password" ? null : f))}
                placeholder="Enter your password"
                placeholderTextColor={Colors.placeholder}
                secureTextEntry={!showPw}
                editable={!loading}
                style={styles.input}
                onSubmitEditing={() => void handleLogin()}
                returnKeyType="go"
              />
              <TouchableOpacity
                onPress={() => setShowPw((p) => !p)}
                style={styles.eyeBtn}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={showPw ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.text3} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn} disabled={loading}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleLogin()}
              disabled={loading}
              activeOpacity={0.92}
              style={[styles.signInBtnWrap, loading && styles.signInBtnBusy]}
            >
              <LinearGradient
                colors={[Colors.brand700, Colors.brand500]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInBtn}
              >
                {loading ? (
                  <View style={styles.signInInner}>
                    <ActivityIndicator color={Colors.onPrimary} size="small" />
                    <Text style={styles.signInBtnText}>Logging in…</Text>
                  </View>
                ) : (
                  <View style={styles.signInInner}>
                    <Text style={styles.signInBtnText}>Login</Text>
                    <Ionicons name="arrow-forward" size={18} color={Colors.onPrimary} style={styles.signInArrow} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {biometricReady && biometricStatus.hardwareAvailable ? (
              <LoginBiometricSection
                status={biometricStatus}
                ready={biometricReady}
                canLogin={biometricCanLogin}
                busy={biometricBusy || loading}
                onSignIn={() => void handleBiometricLogin()}
              />
            ) : null}
          </View>
        </ScrollView>

        <LoginPageFooter />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  body: {
    flex: 1,
    marginTop: -LOGIN_HEADER_OVERLAP
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
    flexGrow: 1,
    minHeight: "100%",
    paddingBottom: Spacing.lg,
    paddingHorizontal: CARD_PAD,
    paddingTop: CARD_PAD,
    width: "100%",
    ...Shadow.cardRaised
  },
  loginTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 4
  },
  loginTitle: {
    color: Colors.text1,
    fontFamily: FONTS.bold,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3
  },
  loginSub: {
    color: Colors.text3,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg
  },
  errorBox: {
    alignItems: "center",
    backgroundColor: Colors.redBg,
    borderColor: Colors.red,
    borderRadius: Radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.md
  },
  errorText: {
    color: Colors.redText,
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: FontSize.caption,
    lineHeight: 18
  },
  debugPanelWrap: {
    marginBottom: Spacing.md
  },
  fieldLabel: {
    color: Colors.text1,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8
  },
  inputBox: {
    alignItems: "center",
    backgroundColor: Colors.inputFill,
    borderColor: Colors.border,
    borderRadius: Radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: INPUT_H,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg
  },
  inputBoxFocused: {
    backgroundColor: Colors.surface,
    borderColor: Colors.brand700,
    borderWidth: 1.5
  },
  inputDisabled: {
    opacity: 0.65
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    color: Colors.text1,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    paddingVertical: 0
  },
  eyeBtn: {
    marginLeft: 4,
    padding: 4
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: Spacing.lg,
    marginTop: -4
  },
  forgotText: {
    color: Colors.brand700,
    fontFamily: FONTS.medium,
    fontSize: 13
  },
  signInBtnWrap: {
    alignSelf: "stretch",
    width: "100%"
  },
  signInBtn: {
    borderRadius: Radius.button,
    height: BTN_H,
    justifyContent: "center",
    width: "100%"
  },
  signInInner: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 20,
    width: "100%"
  },
  signInBtnText: {
    color: Colors.onPrimary,
    fontFamily: FONTS.bold,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  },
  signInArrow: {
    position: "absolute",
    right: 20
  },
  signInBtnBusy: {
    opacity: 0.9
  }
});
