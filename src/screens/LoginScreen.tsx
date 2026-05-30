import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
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
import { greetingForHour, LOGIN_WELCOME_SUBTITLE, LOGIN_WELCOME_TITLE } from "../utils/greeting";

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
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 8}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) }]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
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
            </View>

            <View style={styles.hero}>
              <Text style={styles.timeGreeting}>{greetingForHour()}</Text>
              <Text style={styles.welcome}>{LOGIN_WELCOME_TITLE}</Text>
              <Text style={styles.subline}>{LOGIN_WELCOME_SUBTITLE}</Text>
            </View>

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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 4
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 48
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
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
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2
  },
  hero: {
    marginTop: 20,
    paddingBottom: 4
  },
  timeGreeting: {
    color: AUTH_THEME.neon,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  welcome: {
    color: AUTH_THEME.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.7,
    lineHeight: 36,
    marginTop: 6
  },
  subline: {
    color: AUTH_THEME.textMuted,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
    marginTop: 8
  },
  formSection: {
    gap: 14,
    marginTop: 22
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
    marginTop: 4,
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
    marginTop: 14,
    textAlign: "center"
  },
  footerHint: {
    color: AUTH_THEME.textDim,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center"
  }
});
