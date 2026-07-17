import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  View,
  Text,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoginBiometricSection } from "../components/auth/LoginBiometricSection";
import { LoginHeroHeader, LOGIN_HEADER_OVERLAP } from "../components/auth/LoginHeroHeader";
import { LoginPageFooter } from "../components/auth/LoginPageFooter";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useAuth } from "../storage/AuthContext";
import {
  canUseBiometricLogin,
  clearBiometricLogin,
  dismissBiometricEnrollmentPrompt,
  enableBiometricLoginWithVerification,
  getBiometricLoginStatus,
  hasAttemptedBiometricUnlockThisLaunch,
  markBiometricUnlockAttempted,
  shouldOfferBiometricEnrollment,
  unlockSessionWithBiometrics,
  type BiometricLoginStatus
} from "../storage/biometricLoginStorage";
import { useI18n } from "../i18n/I18nContext";
import { FONTS } from "../theme/fonts";
import { Colors, FontSize, Radius, Shadow, Spacing, TextStyles } from "../../mobile/lib/theme";
import { PrimaryButton, EnterpriseTextField } from "../../mobile/components/ui";
import { ProductionApiDiagnosticsPanel } from "../../mobile/components/diagnostics/ProductionApiDiagnosticsPanel";
import { TechnicalDetailsCollapsible } from "../../mobile/components/layout";
import { ApiRequestError, getNetworkMessage, isNetworkError } from "../utils/apiError";
import {
  categorizeLoginNetworkError,
  loginErrorMessageForCategory
} from "../utils/loginDiagnostics";

const CARD_TOP_RADIUS = 24;
const CARD_PAD = 24;

// Module-level fallback used before i18n context is available; overridden by
// t("login.biometrics") wherever this status is actually displayed.
const EMPTY_BIOMETRIC_STATUS: BiometricLoginStatus = {
  hardwareAvailable: false,
  enrolled: false,
  enabled: false,
  label: "Biometrics"
};

export function LoginScreen() {
  useSecureScreen();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { signIn, loginNotice, clearLoginNotice, completeBiometricUnlock } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [biometricStatus, setBiometricStatus] = useState<BiometricLoginStatus>(EMPTY_BIOMETRIC_STATUS);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricCanLogin, setBiometricCanLogin] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const refreshBiometricState = useCallback(async () => {
    try {
      const [status, canLogin] = await Promise.all([getBiometricLoginStatus(), canUseBiometricLogin()]);
      setBiometricStatus(status);
      setBiometricCanLogin(canLogin);
    } catch {
      setBiometricStatus(EMPTY_BIOMETRIC_STATUS);
      setBiometricCanLogin(false);
    } finally {
      setBiometricReady(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshBiometricState();
    }, [refreshBiometricState])
  );

  async function offerBiometricEnrollmentIfNeeded() {
    if (!(await shouldOfferBiometricEnrollment())) return;
    Alert.alert(t("settings.fingerprintEnableTitle"), t("settings.fingerprintEnableBody"), [
      {
        text: t("settings.fingerprintNotNow"),
        style: "cancel",
        onPress: () => {
          void dismissBiometricEnrollmentPrompt();
        }
      },
      {
        text: t("settings.fingerprintEnableConfirm"),
        onPress: () => {
          void (async () => {
            const enabled = await enableBiometricLoginWithVerification();
            if (!enabled) {
              Alert.alert(t("settings.fingerprintEnableTitle"), t("settings.fingerprintEnableFailed"));
            }
            await refreshBiometricState();
          })();
        }
      }
    ]);
  }

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
    if (field === "password") {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 56, animated: true });
      });
    }
  }

  async function handleLogin() {
    const user = empId.trim();
    if (!user || !password.trim()) {
      setLoginError(t("login.missingCredentials"));
      return;
    }

    setLoading(true);
    setLoginError("");

    try {
      await signIn(user, password);
      await offerBiometricEnrollmentIfNeeded();
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "INVALID_CREDENTIALS") {
        setLoginError(error.message || t("login.invalidCredentials"));
      } else if (isNetworkError(error) || error instanceof ApiRequestError) {
        const category = categorizeLoginNetworkError(error);
        setLoginError(
          loginErrorMessageForCategory(category, getNetworkMessage())
        );
      } else {
        setLoginError(error instanceof Error ? error.message : t("login.invalidCredentials"));
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
        setLoginError(t("login.biometricCancelled"));
        await refreshBiometricState();
        return;
      }
      await completeBiometricUnlock();
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
            ? t("login.accountDisabled")
            : t("login.sessionExpired")
        );
      } else if (isNetworkError(error)) {
        setLoginError(getNetworkMessage());
      } else {
        setLoginError(error instanceof Error ? error.message : t("login.biometricFailed"));
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  useEffect(() => {
    if (!biometricReady || !biometricCanLogin || biometricBusy || loading) return;
    // One automatic prompt per app launch. Survives LoginScreen remounts so
    // tab switches, Profile visits, and repeated foregrounding never re-open it.
    if (hasAttemptedBiometricUnlockThisLaunch()) return;
    markBiometricUnlockAttempted();
    void handleBiometricLogin();
  }, [biometricBusy, biometricCanLogin, biometricReady, loading]);

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
              <Text style={styles.loginTitle} accessibilityRole="header">
                {t("login.title")}
              </Text>
            </View>
            <Text style={styles.loginSub}>{t("login.subtitle")}</Text>

            {loginError ? (
              <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={16} color={Colors.redText} />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {loginError ? (
              <TechnicalDetailsCollapsible>
                <ProductionApiDiagnosticsPanel compact />
              </TechnicalDetailsCollapsible>
            ) : null}

            <Text style={styles.fieldLabel}>{t("login.employeeId")}</Text>
            <EnterpriseTextField
              leftIcon="person-outline"
              value={empId}
              onChangeText={(v) => {
                setEmpId(v);
                if (loginError) setLoginError("");
              }}
              onFocus={() => handleFieldFocus("empId")}
              placeholder={t("login.employeeIdPlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
              accessibilityLabel={t("login.employeeId")}
              containerStyle={styles.fieldGap}
            />

            <Text style={styles.fieldLabel}>{t("login.password")}</Text>
            <EnterpriseTextField
              leftIcon="lock-closed-outline"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (loginError) setLoginError("");
              }}
              onFocus={() => handleFieldFocus("password")}
              placeholder={t("login.passwordPlaceholder")}
              secureTextEntry={!showPw}
              editable={!loading}
              onSubmitEditing={() => void handleLogin()}
              returnKeyType="go"
              rightIcon={showPw ? "eye-off-outline" : "eye-outline"}
              rightIconAccessibilityLabel={showPw ? t("login.hidePassword") : t("login.showPassword")}
              onRightIconPress={() => setShowPw((p) => !p)}
              accessibilityLabel={t("login.password")}
              containerStyle={styles.fieldGap}
            />

            <Text style={styles.forgotText}>{t("login.forgotPassword")}</Text>

            <PrimaryButton
              label={loading ? t("login.submitting") : t("login.submit")}
              onPress={() => void handleLogin()}
              loading={loading}
              disabled={loading}
              style={styles.signInBtnWrap}
            />

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
    ...TextStyles.label,
    color: Colors.text1,
    fontFamily: FONTS.semibold,
    marginBottom: Spacing.sm
  },
  fieldGap: {
    marginBottom: Spacing.md
  },
  forgotText: {
    ...TextStyles.caption,
    color: Colors.text3,
    fontFamily: FONTS.medium,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs
  },
  signInBtnWrap: {
    alignSelf: "stretch",
    marginTop: Spacing.xs,
    width: "100%"
  }
});
