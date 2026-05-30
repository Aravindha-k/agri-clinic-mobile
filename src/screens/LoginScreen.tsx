import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BRAND, LOGO_IMAGE } from "../brand/constants";
import { CinematicAuthBackground } from "../components/auth/CinematicAuthBackground";
import { GlassLoginField } from "../components/login/GlassLoginField";
import { useAuth } from "../storage/AuthContext";
import { AUTH_THEME } from "../theme/authTheme";
import { useSafeAreaInsetsCompat } from "../hooks/useSafeAreaInsetsCompat";

const SCREEN_H = Dimensions.get("window").height;
const HEADER_H = 56;
const HERO_BLOCK_H = 130;

/** Positions hero block center near 37% of screen height. */
function heroMarginTop(safeTop: number) {
  const targetCenter = SCREEN_H * 0.37;
  const topOfHero = targetCenter - HERO_BLOCK_H / 2;
  return Math.max(8, topOfHero - safeTop - HEADER_H);
}

export function LoginScreen() {
  const { signIn, loginNotice, clearLoginNotice } = useAuth();
  const insets = useSafeAreaInsetsCompat();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (loginNotice) {
      setLoginError(loginNotice);
      clearLoginNotice();
    }
  }, [clearLoginNotice, loginNotice]);

  async function handleLogin() {
    const user = username.trim();
    if (!user || !password) {
      setLoginError("Enter username and password.");
      return;
    }
    setLoading(true);
    setLoginError("");
    try {
      await signIn(user, password);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = Boolean(username.trim() && password) && !loading;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CinematicAuthBackground />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 12}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.main}>
              {/* Header — fixed 56 */}
              <View style={styles.header}>
                <View style={styles.brandRow}>
                  <View style={styles.logoSm}>
                    {LOGO_IMAGE ? (
                      <Image source={LOGO_IMAGE} style={styles.logoSmImg} resizeMode="contain" />
                    ) : (
                      <Ionicons name="leaf" size={18} color={AUTH_THEME.neon} />
                    )}
                  </View>
                  <Text style={styles.brandName} numberOfLines={1}>
                    {BRAND.appName}
                  </Text>
                </View>
                <Pressable style={styles.helpChip} accessibilityRole="button">
                  <Ionicons name="help-circle-outline" size={16} color={AUTH_THEME.textMuted} />
                  <Text style={styles.helpText}>Help</Text>
                </Pressable>
              </View>

              {/* Hero — ~37% screen, then form directly below */}
              <View style={[styles.hero, { marginTop: heroMarginTop(insets.top) }]}>
                <Text style={styles.headline}>Start Your Field Work Today</Text>
                <Text style={styles.subline}>
                  Manage visits, farmers, GPS tracking and field reports in one place.
                </Text>
              </View>

              {/* Form — compact, not pinned to bottom */}
              <View style={styles.formSection}>
                {loginError ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color={AUTH_THEME.danger} />
                    <Text style={styles.errorText}>{loginError}</Text>
                  </View>
                ) : null}

                <GlassLoginField
                  icon="person-outline"
                  placeholder="Employee ID or username"
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    if (loginError) setLoginError("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                />

                <GlassLoginField
                  icon="lock-closed-outline"
                  placeholder="Password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (loginError) setLoginError("");
                  }}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (canSubmit) void handleLogin();
                  }}
                  right={
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={AUTH_THEME.textMuted}
                      />
                    </Pressable>
                  }
                />

                <Pressable
                  accessibilityRole="button"
                  disabled={!canSubmit}
                  onPress={() => void handleLogin()}
                  style={({ pressed }) => [
                    styles.signInBtn,
                    !canSubmit && styles.signInBtnOff,
                    pressed && canSubmit && styles.signInBtnPressed
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={AUTH_THEME.bg} />
                  ) : (
                    <Text style={[styles.signInText, !canSubmit && styles.signInTextOff]}>Sign In</Text>
                  )}
                </Pressable>

                <Text style={styles.footer}>Need help? Contact admin</Text>
                <Text style={styles.footerHint}>{BRAND.employeeHint}</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: AUTH_THEME.bg,
    flex: 1
  },
  safe: {
    flex: 1,
    zIndex: 1
  },
  flex: {
    flex: 1
  },
  scroll: {
    flexGrow: 1
  },
  main: {
    paddingBottom: 32,
    paddingHorizontal: 20
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: HEADER_H,
    justifyContent: "space-between"
  },
  brandRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
    paddingRight: 8
  },
  logoSm: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  logoSmImg: {
    height: 26,
    width: 26
  },
  brandName: {
    color: AUTH_THEME.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2
  },
  helpChip: {
    alignItems: "center",
    backgroundColor: AUTH_THEME.chip,
    borderColor: AUTH_THEME.glassBorder,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  helpText: {
    color: AUTH_THEME.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  hero: {
    minHeight: HERO_BLOCK_H
  },
  headline: {
    color: AUTH_THEME.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.7,
    lineHeight: 38
  },
  subline: {
    color: AUTH_THEME.textMuted,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
    marginTop: 10
  },
  formSection: {
    gap: 14,
    marginTop: 24,
    paddingBottom: 8
  },
  errorBox: {
    alignItems: "center",
    backgroundColor: AUTH_THEME.dangerBg,
    borderColor: "rgba(255,107,107,0.35)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12
  },
  errorText: {
    color: AUTH_THEME.danger,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  signInBtn: {
    alignItems: "center",
    backgroundColor: AUTH_THEME.neonMid,
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 6,
    minHeight: 54
  },
  signInBtnOff: {
    backgroundColor: "rgba(46,230,106,0.28)",
    borderColor: "rgba(61,255,138,0.2)",
    borderWidth: 1
  },
  signInBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  signInText: {
    color: AUTH_THEME.bg,
    fontSize: 17,
    fontWeight: "800"
  },
  signInTextOff: {
    color: "rgba(5,13,10,0.55)"
  },
  footer: {
    color: AUTH_THEME.textMuted,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 16,
    textAlign: "center"
  },
  footerHint: {
    color: AUTH_THEME.textDim,
    fontSize: 11,
    marginTop: 6,
    textAlign: "center"
  }
});
