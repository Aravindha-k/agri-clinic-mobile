import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, {
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoginBiometricSection } from "../components/auth/LoginBiometricSection";
import { BRAND } from "../config/brand";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useAuth } from "../storage/AuthContext";
import {
  canUseBiometricLogin,
  clearBiometricLogin,
  getBiometricLoginStatus,
  readBiometricCredentials,
  type BiometricLoginStatus
} from "../storage/biometricLoginStorage";
import { FONTS } from "../theme/fonts";
import { Colors, Radius, Shadow } from "../../mobile/lib/theme";
import { LoginImagePanel } from "../../mobile/components/nature";
import { ProductionApiDiagnosticsPanel } from "../../mobile/components/diagnostics/ProductionApiDiagnosticsPanel";
import { ApiRequestError, getNetworkMessage, isNetworkError } from "../utils/apiError";

const SPLASH_LOGO = require("../../assets/brand/logo-splash.png");

const SCREEN_BG = "#F8F7F2";
const SHEET_BG = "#FCFCFA";
const INPUT_BG = "#FFFFFF";
const INPUT_BORDER = "#E5E7EB";
const TEXT_MAIN = "#2F3830";
const TEXT_MUTED = "#4B554C";

const HERO_RATIO = 0.52;
const SHEET_TOP_GAP = 18;
const SHEET_RADIUS = 24;
const LOGO_SIZE = 74;

const EMPTY_BIOMETRIC_STATUS: BiometricLoginStatus = {
  hardwareAvailable: false,
  enrolled: false,
  enabled: false,
  label: "Biometrics"
};

function LoginLogoMark() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: REasing.inOut(REasing.sin) }),
        withTiming(1, { duration: 1200, easing: REasing.inOut(REasing.sin) })
      ),
      -1,
      false
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Reanimated.View style={animatedStyle}>
      <Image
        source={SPLASH_LOGO}
        style={styles.logoMark}
        resizeMode="contain"
        accessibilityLabel="App logo"
      />
    </Reanimated.View>
  );
}

export function LoginScreen() {
  useSecureScreen();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const heroHeight = Math.round(screenH * HERO_RATIO);
  const sheetTop = heroHeight + SHEET_TOP_GAP;
  const sheetMinHeight = screenH - sheetTop;
  const { signIn, loginNotice, clearLoginNotice } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const formY = useRef(new Animated.Value(10)).current;
  const formAlpha = useRef(new Animated.Value(0)).current;
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
    Animated.parallel([
      Animated.timing(formY, {
        toValue: 0,
        duration: 320,
        delay: 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(formAlpha, {
        toValue: 1,
        duration: 280,
        delay: 60,
        useNativeDriver: true
      })
    ]).start();
  }, [formAlpha, formY]);

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
      setLoginError("Enter username and password.");
      return;
    }

    setLoading(true);
    setLoginError("");

    try {
      await signIn(user, password);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "INVALID_CREDENTIALS") {
        setLoginError(error.message || "Please check your credentials.");
      } else if (isNetworkError(error)) {
        setLoginError(getNetworkMessage());
      } else {
        setLoginError(error instanceof Error ? error.message : "Please check your credentials.");
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
      const credentials = await readBiometricCredentials();
      if (!credentials) {
        setLoginError("Biometric sign-in was cancelled.");
        return;
      }
      await signIn(credentials.username, credentials.password);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "INVALID_CREDENTIALS") {
        await clearBiometricLogin();
        await refreshBiometricState();
        setLoginError(error.message || "Saved sign-in expired. Use your password.");
      } else if (isNetworkError(error)) {
        setLoginError(getNetworkMessage());
      } else {
        setLoginError(error instanceof Error ? error.message : "Biometric sign-in failed.");
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Layer 1 — fixed hero (never moves with keyboard) */}
      <View style={[styles.hero, { height: heroHeight }]}>
        <LoginImagePanel style={StyleSheet.absoluteFillObject} />
        <View
          style={[styles.brand, { top: insets.top + 8, right: 16 }]}
          pointerEvents="none"
        >
          <LoginLogoMark />
          <Text style={styles.brandName}>{BRAND.splashTitle}</Text>
        </View>
      </View>

      {/* Layer 2 — bottom sheet (keyboard-aware only) */}
      <KeyboardAvoidingView
        style={[styles.sheetHost, { top: sheetTop }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.sheetScroll}
          contentContainerStyle={[styles.sheetScrollContent, { minHeight: sheetMinHeight }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={keyboardOpen || screenH < 720}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                minHeight: sheetMinHeight,
                paddingBottom: insets.bottom + 12,
                opacity: formAlpha,
                transform: [{ translateY: formY }]
              }
            ]}
          >
            <View>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSub}>
              {loading ? "Verifying your credentials…" : "Sign in to your field workspace"}
            </Text>

            {loginError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#B91C1C" />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {loginError ? (
              <View style={styles.debugPanelWrap}>
                <ProductionApiDiagnosticsPanel compact />
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Employee ID</Text>
            <View
              style={[
                styles.inputBox,
                focusedField === "empId" && styles.inputBoxFocused,
                loading && styles.inputDisabled
              ]}
            >
              <Ionicons name="id-card-outline" size={18} color={TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                value={empId}
                onChangeText={(t) => {
                  setEmpId(t);
                  if (loginError) setLoginError("");
                }}
                onFocus={() => handleFieldFocus("empId")}
                onBlur={() => setFocusedField((f) => (f === "empId" ? null : f))}
                placeholder="e.g. AG-8821"
                placeholderTextColor="rgba(47,56,48,0.42)"
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
              <Ionicons name="lock-closed-outline" size={18} color={TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (loginError) setLoginError("");
                }}
                onFocus={() => handleFieldFocus("password")}
                onBlur={() => setFocusedField((f) => (f === "password" ? null : f))}
                placeholder="Enter password"
                placeholderTextColor="rgba(47,56,48,0.42)"
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
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn} disabled={loading}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.signInBtnBusy]}
              onPress={() => void handleLogin()}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.signInBtnText}>Signing in…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.signInBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.surface} />
                </>
              )}
            </TouchableOpacity>
            </View>

            {biometricReady && biometricStatus.hardwareAvailable ? (
              <View style={styles.bottomFill}>
                <LoginBiometricSection
                  status={biometricStatus}
                  ready={biometricReady}
                  canLogin={biometricCanLogin}
                  busy={biometricBusy || loading}
                  onSignIn={() => void handleBiometricLogin()}
                />
                <Text style={styles.footer}>
                  {BRAND.appName} · {BRAND.portalSubtitle}
                </Text>
              </View>
            ) : (
              <Text style={[styles.footer, styles.footerCompact]}>
                {BRAND.appName} · {BRAND.portalSubtitle}
              </Text>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SCREEN_BG,
    flex: 1
  },
  hero: {
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%",
    zIndex: 1
  },
  brand: {
    alignItems: "flex-end",
    position: "absolute",
    zIndex: 2
  },
  logoMark: {
    height: LOGO_SIZE,
    width: LOGO_SIZE
  },
  brandName: {
    color: "#FFFFFF",
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
    marginTop: 4,
    textAlign: "right",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  sheetHost: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 2
  },
  sheetScroll: {
    flex: 1
  },
  sheetScrollContent: {
    flexGrow: 1
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    width: "100%"
  },
  welcomeTitle: {
    color: TEXT_MAIN,
    fontFamily: FONTS.extrabold,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3
  },
  welcomeSub: {
    color: TEXT_MUTED,
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
    marginTop: 2
  },
  errorBox: {
    alignItems: "center",
    backgroundColor: "rgba(254,226,226,0.65)",
    borderColor: "rgba(252,165,165,0.55)",
    borderRadius: Radius.inner,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    padding: 8
  },
  errorText: {
    color: "#B91C1C",
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12
  },
  debugPanelWrap: {
    marginBottom: 10
  },
  fieldLabel: {
    color: TEXT_MAIN,
    fontFamily: FONTS.semibold,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4
  },
  inputBox: {
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: Radius.button,
    borderWidth: 1,
    flexDirection: "row",
    height: 42,
    marginBottom: 8,
    paddingHorizontal: 12
  },
  inputBoxFocused: {
    borderColor: Colors.brand700,
    borderWidth: 1.5
  },
  inputDisabled: {
    opacity: 0.7
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    color: TEXT_MAIN,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    paddingVertical: 0
  },
  eyeBtn: {
    paddingHorizontal: 4
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 10,
    marginTop: -2
  },
  forgotText: {
    color: Colors.brand700,
    fontFamily: FONTS.semibold,
    fontSize: 12,
    fontWeight: "600"
  },
  signInBtn: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: Radius.button,
    flexDirection: "row",
    gap: 8,
    height: 44,
    justifyContent: "center",
    ...Shadow.cardRaised
  },
  signInBtnBusy: {
    opacity: 0.9
  },
  signInBtnText: {
    color: Colors.surface,
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: "700"
  },
  bottomFill: {
    flexGrow: 1,
    justifyContent: "flex-end",
    minHeight: 120,
    paddingTop: 4
  },
  footer: {
    color: "rgba(75,85,76,0.7)",
    fontFamily: FONTS.regular,
    fontSize: 9,
    marginTop: 10,
    textAlign: "center"
  },
  footerCompact: {
    marginTop: 12
  }
});
