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
import { BRAND, LOGO_IMAGE } from "../brand/constants";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
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
      <AuthScreenLayout variant="brand" contentStyle={styles.layout}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) }]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroBlock}>
              <View style={styles.logoPlate}>
                {LOGO_IMAGE ? (
                  <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
                ) : (
                  <Ionicons name="leaf" size={32} color={AUTH_THEME.neonMid} />
                )}
              </View>
              <Text style={styles.brandName}>{BRAND.appName}</Text>
              <Text style={styles.timeGreeting}>{greetingForHour()}</Text>
              <Text style={styles.welcome}>{LOGIN_WELCOME_TITLE}</Text>
              <Text style={styles.subline}>{LOGIN_WELCOME_SUBTITLE}</Text>
            </View>

            <View style={styles.card}>
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
            </View>

            <Text style={styles.footer}>Need help? Contact admin</Text>
            <Text style={styles.footerHint}>{BRAND.employeeHint}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuthScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  layout: {
    justifyContent: "flex-start",
    paddingHorizontal: 0
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12
  },
  heroBlock: {
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 8
  },
  logoPlate: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    height: 80,
    justifyContent: "center",
    marginBottom: 14,
    width: 80
  },
  logo: { height: 54, width: 54 },
  brandName: {
    color: AUTH_THEME.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center"
  },
  timeGreeting: {
    color: AUTH_THEME.neon,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 10
  },
  welcome: {
    color: AUTH_THEME.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
    marginTop: 4,
    textAlign: "center"
  },
  subline: {
    color: AUTH_THEME.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center"
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 18
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
    minHeight: 52
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
    marginTop: 18,
    textAlign: "center"
  },
  footerHint: {
    color: AUTH_THEME.textDim,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center"
  }
});
