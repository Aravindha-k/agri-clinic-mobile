import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { BRAND, LOGO_IMAGE, BRAND_COLORS } from "../config/brand";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useAuth } from "../storage/AuthContext";
import { LOGO_SIZES } from "../brand/logoSizing";
import { FONTS } from "../theme/fonts";
import { Colors } from "../../mobile/lib/theme";
import { ApiRequestError, getNetworkMessage, isNetworkError } from "../utils/apiError";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { height: SH } = Dimensions.get("window");

const DARK = "#0d1f14";
const ACCENT = BRAND_COLORS.primary;
const ACCENT_DARK = BRAND_COLORS.secondary;
const TOP_H = Math.round(SH * 0.38);
const RING_C = 452;
const LOGO_SIZE = LOGO_SIZES.loginPlate;
const LOGO_IMG = LOGO_SIZES.loginMark;

const SERVICE_CARDS = [
  { icon: "leaf-outline" as const, lines: ["Field", "Inspection"] },
  { icon: "water-outline" as const, lines: ["Crop", "Solutions"] },
  { icon: "nutrition-outline" as const, lines: ["Seeds &", "Fertilizers"] }
];

const STATS = [
  { value: "100+", label: "Farmers" },
  { value: "6+", label: "Services" },
  { value: "GPS", label: "Tracking" }
];

function ringLoop(
  scale: Animated.Value,
  opacity: Animated.Value,
  toScale: number,
  toOpacity: number,
  baseOpacity: number,
  dur: number,
  delay: number
) {
  return Animated.loop(
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: toScale,
          duration: dur,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: toOpacity,
          duration: dur,
          useNativeDriver: true
        })
      ]),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: dur,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: baseOpacity,
          duration: dur,
          useNativeDriver: true
        })
      ])
    ])
  );
}

function dotLoop(dot: Animated.Value, delay: number) {
  return Animated.loop(
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(dot, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0.2, duration: 500, useNativeDriver: true })
    ])
  );
}

function floatLoop(val: Animated.Value, dur: number, delay: number) {
  return Animated.loop(
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(val, {
        toValue: -7,
        duration: dur,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(val, {
        toValue: 0,
        duration: dur,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ])
  );
}

function LeafIcon({ size, style }: { size: number; style?: object }) {
  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 2C7.5 8.5 4.5 12 12 22C19.5 12 16.5 8.5 12 2Z"
          fill={ACCENT}
          opacity={0.055}
        />
      </Svg>
    </View>
  );
}

export function LoginScreen() {
  useSecureScreen();
  const { signIn, loginNotice, clearLoginNotice } = useAuth();

  const rotate = useRef(new Animated.Value(0)).current;
  const r1s = useRef(new Animated.Value(1)).current;
  const r1o = useRef(new Animated.Value(0.12)).current;
  const r2s = useRef(new Animated.Value(1)).current;
  const r2o = useRef(new Animated.Value(0.07)).current;
  const r3s = useRef(new Animated.Value(1)).current;
  const r3o = useRef(new Animated.Value(0.04)).current;
  const d1 = useRef(new Animated.Value(0.2)).current;
  const d2 = useRef(new Animated.Value(0.2)).current;
  const d3 = useRef(new Animated.Value(0.2)).current;
  const cardY = useRef(new Animated.Value(70)).current;
  const cardAlpha = useRef(new Animated.Value(0)).current;
  const authAlpha = useRef(new Animated.Value(0)).current;
  const tag1Y = useRef(new Animated.Value(0)).current;
  const tag2Y = useRef(new Animated.Value(0)).current;
  const tag3Y = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const rotLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const logoPulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const ringRefs = useRef<Animated.CompositeAnimation[]>([]);
  const dotRefs = useRef<Animated.CompositeAnimation[]>([]);
  const floatRefs = useRef<Animated.CompositeAnimation[]>([]);

  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const startLogoIdlePulse = useCallback(() => {
    logoPulseRef.current?.stop();
    logoScale.setValue(1);
    logoPulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.06,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    logoPulseRef.current.start();
  }, [logoScale]);

  const speedUpAnimations = useCallback(() => {
    rotLoopRef.current?.stop();
    rotate.setValue(0);
    rotLoopRef.current = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    rotLoopRef.current.start();

    logoPulseRef.current?.stop();
    logoPulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.1, duration: 350, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 0.96, duration: 350, useNativeDriver: true })
      ])
    );
    logoPulseRef.current.start();

    Animated.timing(authAlpha, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [authAlpha, logoScale, rotate]);

  const slowDownAnimations = useCallback(() => {
    rotLoopRef.current?.stop();
    rotate.setValue(0);
    rotLoopRef.current = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    rotLoopRef.current.start();
    startLogoIdlePulse();
    authAlpha.setValue(0);
  }, [authAlpha, rotate, startLogoIdlePulse]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardY, {
        toValue: 0,
        duration: 650,
        delay: 200,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true
      }),
      Animated.timing(cardAlpha, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true
      })
    ]).start();

    Animated.parallel([
      Animated.timing(circleOpacity, {
        toValue: 1,
        duration: 300,
        delay: 80,
        useNativeDriver: true
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        delay: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    Animated.spring(logoScale, {
      toValue: 1,
      tension: 55,
      friction: 6,
      delay: 180,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) startLogoIdlePulse();
    });

    rotate.setValue(0);
    rotLoopRef.current = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    rotLoopRef.current.start();

    ringRefs.current = [
      ringLoop(r1s, r1o, 1.08, 0.32, 0.12, 1500, 0),
      ringLoop(r2s, r2o, 1.13, 0.2, 0.07, 1750, 600),
      ringLoop(r3s, r3o, 1.18, 0.12, 0.04, 2000, 1200)
    ];
    ringRefs.current.forEach((anim) => anim.start());

    dotRefs.current = [dotLoop(d1, 0), dotLoop(d2, 250), dotLoop(d3, 500)];
    dotRefs.current.forEach((anim) => anim.start());

    floatRefs.current = [
      floatLoop(tag1Y, 1400, 0),
      floatLoop(tag2Y, 1600, 400),
      floatLoop(tag3Y, 1300, 800)
    ];
    floatRefs.current.forEach((anim) => anim.start());

    return () => {
      rotLoopRef.current?.stop();
      logoPulseRef.current?.stop();
      ringRefs.current.forEach((anim) => anim.stop());
      dotRefs.current.forEach((anim) => anim.stop());
      floatRefs.current.forEach((anim) => anim.stop());
      rotate.stopAnimation();
      logoScale.stopAnimation();
      logoOpacity.stopAnimation();
      circleOpacity.stopAnimation();
      r1s.stopAnimation();
      r1o.stopAnimation();
      r2s.stopAnimation();
      r2o.stopAnimation();
      r3s.stopAnimation();
      r3o.stopAnimation();
      d1.stopAnimation();
      d2.stopAnimation();
      d3.stopAnimation();
      tag1Y.stopAnimation();
      tag2Y.stopAnimation();
      tag3Y.stopAnimation();
    };
  }, [
    cardAlpha,
    cardY,
    circleOpacity,
    d1,
    d2,
    d3,
    logoOpacity,
    logoScale,
    r1o,
    r1s,
    r2o,
    r2s,
    r3o,
    r3s,
    rotate,
    startLogoIdlePulse,
    tag1Y,
    tag2Y,
    tag3Y
  ]);

  useEffect(() => {
    if (loginNotice) {
      setLoginError(loginNotice);
      clearLoginNotice();
    }
  }, [clearLoginNotice, loginNotice]);

  async function handleLogin() {
    const user = empId.trim();
    if (!user || !password.trim()) {
      setLoginError("Enter username and password.");
      return;
    }

    setLoading(true);
    setLoginError("");
    speedUpAnimations();

    try {
      await signIn(user, password);
    } catch (error) {
      slowDownAnimations();
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

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const tagFloats = [tag1Y, tag2Y, tag3Y];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={DARK} />

      {/* ── DARK TOP ZONE ── */}
      <View style={[styles.topZone, { height: TOP_H }]}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: DARK }} />
        </View>
        <LeafIcon size={52} style={styles.leaf1} />
        <LeafIcon size={64} style={styles.leaf2} />
        <LeafIcon size={44} style={styles.leaf3} />

        <View style={styles.logoStack}>
          <Animated.View
            style={[
              styles.pulseRing,
              { width: 200, height: 200, borderRadius: 100, opacity: r3o, transform: [{ scale: r3s }] }
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              { width: 174, height: 174, borderRadius: 87, opacity: r2o, transform: [{ scale: r2s }] }
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              { width: 148, height: 148, borderRadius: 74, opacity: r1o, transform: [{ scale: r1s }] }
            ]}
          />

          <Animated.View style={[styles.arcWrap, { transform: [{ rotate: spin }] }]}>
            <Svg width={166} height={166}>
              <Circle cx={83} cy={83} r={80} stroke="rgba(255,255,255,0.08)" strokeWidth={1} fill="none" />
              <AnimatedCircle
                cx={83}
                cy={83}
                r={80}
                stroke={ACCENT}
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_C * 0.35} ${RING_C}`}
                rotation={-90}
                origin="83, 83"
              />
            </Svg>
          </Animated.View>

          <Animated.View style={[styles.logoCircle, { opacity: circleOpacity }]}>
            {LOGO_IMAGE ? (
              <Animated.View
                style={[styles.logoInner, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
              >
                <Image source={LOGO_IMAGE} style={styles.logoImg} resizeMode="contain" accessibilityLabel="App logo" />
              </Animated.View>
            ) : null}
          </Animated.View>
        </View>

        <Text style={styles.appName}>{BRAND.splashTitle}</Text>

        {loading ? (
          <Animated.Text style={[styles.authStatus, { opacity: authAlpha }]}>Authenticating…</Animated.Text>
        ) : null}

        <View style={styles.dotsRow}>
          {[d1, d2, d3].map((d, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
          ))}
        </View>
      </View>

      {/* ── WHITE FORM CARD ── */}
      <Animated.View style={[styles.card, { opacity: cardAlpha, transform: [{ translateY: cardY }] }]}>
        <View style={styles.cardGreenLine} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardScroll}
        >
          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSub}>
            {loading ? "Verifying your credentials…" : "Sign in to your field workspace"}
          </Text>

          {loginError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.red} />
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Employee ID</Text>
          <View style={[styles.inputBox, loading && styles.inputDisabled]}>
            <Ionicons name="id-card-outline" size={18} color={Colors.text4} style={styles.inputIcon} />
            <TextInput
              value={empId}
              onChangeText={(t) => {
                setEmpId(t);
                if (loginError) setLoginError("");
              }}
              placeholder="e.g. AG-8821"
              placeholderTextColor={Colors.text4}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              style={styles.input}
              returnKeyType="next"
            />
            {empId.length > 2 && !loading ? (
              <Ionicons name="checkmark-circle" size={18} color={ACCENT_DARK} />
            ) : null}
          </View>

          <Text style={styles.fieldLabel}>Password</Text>
          <View style={[styles.inputBox, loading && styles.inputDisabled]}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.text4} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (loginError) setLoginError("");
              }}
              placeholder="Enter password"
              placeholderTextColor={Colors.text4}
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
              <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.text3} />
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

          {/* ── BOTTOM FILL — Service cards + stats ── */}
          <View style={styles.bottomFill}>
            <View style={styles.servicesHeader}>
              <View style={styles.servicesLine} />
              <Text style={styles.servicesTitle}>Our Services</Text>
              <View style={styles.servicesLine} />
            </View>

            <View style={styles.serviceRow}>
              {SERVICE_CARDS.map((card, index) => (
                <Animated.View
                  key={card.icon}
                  style={[styles.serviceCard, { transform: [{ translateY: tagFloats[index] }] }]}
                >
                  <View style={styles.serviceIconWrap}>
                    <Ionicons name={card.icon} size={20} color={ACCENT_DARK} />
                  </View>
                  <Text style={styles.serviceLabel}>
                    {card.lines[0]}
                    {"\n"}
                    {card.lines[1]}
                  </Text>
                </Animated.View>
              ))}
            </View>

            <View style={styles.statsBar}>
              {STATS.map((stat, index) => (
                <View key={stat.label} style={[styles.statItem, index > 0 && styles.statItemBorder]}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.trustCopy}>
              Trusted agriculture partner for{"\n"}better crop yield & soil health
            </Text>
          </View>
        </ScrollView>

        <SafeAreaView>
          <Text style={styles.footer}>
            {BRAND.appName} · {BRAND.portalSubtitle}
          </Text>
        </SafeAreaView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: DARK,
    flex: 1
  },
  topZone: {
    alignItems: "center",
    backgroundColor: DARK,
    justifyContent: "flex-end",
    overflow: "hidden",
    paddingBottom: 14
  },
  leaf1: {
    left: "6%",
    position: "absolute",
    top: "10%",
    transform: [{ rotate: "-28deg" }]
  },
  leaf2: {
    position: "absolute",
    right: "8%",
    top: "6%",
    transform: [{ rotate: "22deg" }]
  },
  leaf3: {
    left: "42%",
    position: "absolute",
    top: "4%",
    transform: [{ rotate: "-8deg" }]
  },
  logoStack: {
    alignItems: "center",
    height: 200,
    justifyContent: "center",
    width: 200
  },
  pulseRing: {
    borderColor: "rgba(76,175,130,0.55)",
    borderWidth: 1,
    position: "absolute"
  },
  arcWrap: {
    alignItems: "center",
    height: 166,
    justifyContent: "center",
    position: "absolute",
    width: 166
  },
  logoCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: "rgba(76,175,130,0.55)",
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 3,
    height: LOGO_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    width: LOGO_SIZE
  },
  logoInner: {
    alignItems: "center",
    justifyContent: "center"
  },
  logoImg: {
    height: LOGO_IMG,
    width: LOGO_IMG
  },
  appName: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 8
  },
  authStatus: {
    color: ACCENT,
    fontFamily: FONTS.medium,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
    marginTop: 4
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8
  },
  dot: {
    backgroundColor: ACCENT,
    borderRadius: 3,
    height: 6,
    width: 6
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    overflow: "hidden"
  },
  cardGreenLine: {
    backgroundColor: Colors.brand700,
    height: 3,
    width: "100%"
  },
  cardScroll: {
    flexGrow: 1,
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 20
  },
  welcomeTitle: {
    color: Colors.text1,
    fontFamily: FONTS.extrabold,
    fontSize: 22,
    fontWeight: "800"
  },
  welcomeSub: {
    color: Colors.text4,
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    marginBottom: 16,
    marginTop: 4
  },
  errorBox: {
    alignItems: "center",
    backgroundColor: Colors.redBg,
    borderColor: "#FECACA",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    padding: 10
  },
  errorText: {
    color: Colors.red,
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12
  },
  fieldLabel: {
    color: Colors.text3,
    fontFamily: FONTS.semibold,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6
  },
  inputBox: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    height: 48,
    marginBottom: 12,
    paddingHorizontal: 12
  },
  inputDisabled: {
    opacity: 0.7
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    color: Colors.text1,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    paddingVertical: 0
  },
  eyeBtn: {
    paddingHorizontal: 4
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 14,
    marginTop: -2
  },
  forgotText: {
    color: Colors.brand700,
    fontFamily: FONTS.semibold,
    fontSize: 11,
    fontWeight: "600"
  },
  signInBtn: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center"
  },
  signInBtnBusy: {
    opacity: 0.9
  },
  signInBtnText: {
    color: Colors.surface,
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: "700"
  },
  bottomFill: {
    marginTop: 20,
    paddingBottom: 4
  },
  servicesHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  servicesLine: {
    backgroundColor: Colors.border,
    flex: 1,
    height: 1
  },
  servicesTitle: {
    color: Colors.text3,
    fontFamily: FONTS.semibold,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  serviceRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 14
  },
  serviceCard: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 12
  },
  serviceIconWrap: {
    alignItems: "center",
    backgroundColor: BRAND_COLORS.primarySoft,
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  serviceLabel: {
    color: Colors.text1,
    fontFamily: FONTS.semibold,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
    textAlign: "center"
  },
  statsBar: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand100,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    overflow: "hidden"
  },
  statItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 12
  },
  statItemBorder: {
    borderLeftColor: Colors.brand100,
    borderLeftWidth: 1
  },
  statValue: {
    color: Colors.brand700,
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: "700"
  },
  statLabel: {
    color: Colors.text3,
    fontFamily: FONTS.medium,
    fontSize: 10,
    marginTop: 2
  },
  trustCopy: {
    color: Colors.text4,
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center"
  },
  footer: {
    color: Colors.text4,
    fontFamily: FONTS.regular,
    fontSize: 10,
    paddingBottom: 6,
    textAlign: "center"
  }
});
