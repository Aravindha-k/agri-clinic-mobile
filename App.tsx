import "react-native-reanimated";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KavyaCinematicSplash } from "./src/components/brand/KavyaCinematicSplash";
import { SPLASH_ASSETS } from "./src/components/brand/splashAssets";
import { NATIVE_LAUNCH_BG } from "./src/components/brand/splashColors";
import { hideNativeSplashSafe, holdNativeSplash } from "./src/bootstrap/nativeSplash";
import { onSplashReplayRequested } from "./src/bootstrap/splashReplay";
import { logStartup, logStartupError } from "./src/utils/startupDiagnostics";
import { installGlobalErrorHandlers } from "./src/utils/globalErrorHandlers";

type ProvidersComponent = ComponentType<{ onCriticalReady?: () => void }>;

/** App shell background after splash (matches login / theme). */
const APP_BG = "#F8F7F2";

type StartupPhase = "cinematic" | "revealing" | "app";
/** Must fire before the cinematic's 6.5s hard ceiling so recovery is already painted. */
const PROVIDERS_WATCHDOG_MS = 5500;
/** Last-resort native splash hide if cinematic onReady never fires (OEM layout hangs). */
const NATIVE_SPLASH_FAILSAFE_MS = 8000;

function preloadSplashAssets() {
  const bg = Image.resolveAssetSource(SPLASH_ASSETS.background);
  const logo = Image.resolveAssetSource(SPLASH_ASSETS.logo);
  return Promise.all([
    bg.uri ? Image.prefetch(bg.uri) : Promise.resolve(false),
    logo.uri ? Image.prefetch(logo.uri) : Promise.resolve(false)
  ]).catch(() => undefined);
}

export default function App() {
  const [phase, setPhase] = useState<StartupPhase>("cinematic");
  const [splashKey, setSplashKey] = useState(0);
  const [Providers, setProviders] = useState<ProvidersComponent | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [providerAttempt, setProviderAttempt] = useState(0);
  const [criticalReady, setCriticalReady] = useState(false);
  const layoutAtRef = useRef<number | null>(null);

  useEffect(() => {
    installGlobalErrorHandlers();
    logStartup("first_render");
    void holdNativeSplash();
    void preloadSplashAssets();
    const failsafe = setTimeout(() => {
      void hideNativeSplashSafe("absolute_failsafe");
    }, NATIVE_SPLASH_FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    let active = true;
    let watchdogFired = false;
    const watchdog = setTimeout(() => {
      if (!active) return;
      watchdogFired = true;
      logStartupError("App providers did not load before the startup watchdog");
      setBootError("timeout");
      setCriticalReady(true);
    }, PROVIDERS_WATCHDOG_MS);

    void import("./AppProviders")
      .then((mod) => {
        if (!active) return;
        clearTimeout(watchdog);
        setProviders(() => mod.default);
        if (!watchdogFired) setBootError(null);
        logStartup("providers_module_ready");
      })
      .catch((err) => {
        if (!active) return;
        clearTimeout(watchdog);
        const message = err instanceof Error ? err.message : String(err);
        logStartupError(message);
        setBootError(message);
        setCriticalReady(true);
      });
    return () => {
      active = false;
      clearTimeout(watchdog);
    };
  }, [providerAttempt]);

  useEffect(() => {
    return onSplashReplayRequested((reason) => {
      logStartup("splash_replay", reason ?? "sign_out");
      setSplashKey((key) => key + 1);
      setPhase("cinematic");
      setCriticalReady(false);
      layoutAtRef.current = null;
    });
  }, []);

  const elapsed = useCallback(() => {
    if (layoutAtRef.current == null) return 0;
    return Math.max(0, Date.now() - layoutAtRef.current);
  }, []);

  /** Native splash hides only after cinematic background + logo layer have painted. */
  const handleCinematicReady = useCallback(() => {
    layoutAtRef.current = Date.now();
    void hideNativeSplashSafe("cinematic_first_layout");
  }, []);

  const handleCriticalReady = useCallback(() => {
    setCriticalReady(true);
    logStartup("providers_ready", `${elapsed()} ms`);
  }, [elapsed]);

  const handleCinematicExitStart = useCallback(() => {
    logStartup("app_ready", `exit_started ${elapsed()} ms`);
    setPhase("revealing");
  }, [elapsed]);

  const handleCinematicFinish = useCallback(() => {
    logStartup("app_revealed", `${elapsed()} ms`);
    logStartup("splash_end", `${elapsed()} ms`);
    setPhase("app");
  }, [elapsed]);

  const retryProviderLoad = useCallback(() => {
    setBootError(null);
    setProviders(null);
    setCriticalReady(false);
    setPhase("cinematic");
    layoutAtRef.current = null;
    setSplashKey((key) => key + 1);
    setProviderAttempt((attempt) => attempt + 1);
    logStartup("providers_module_ready", "retry_requested");
  }, []);

  const showSplash = phase === "cinematic" || phase === "revealing";
  const showShell = Providers != null || bootError != null;
  /** Keep providers mounted for auth/fonts, but hide until exit fade so login cannot flash under splash. */
  const shellVisible = phase === "revealing" || phase === "app";
  const rootBg = showSplash ? NATIVE_LAUNCH_BG : APP_BG;

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: rootBg }]}>
      <SafeAreaProvider>
        {showShell ? (
          <View
            style={[styles.shell, !shellVisible && styles.shellHidden]}
            pointerEvents={shellVisible ? "auto" : "none"}
            accessibilityElementsHidden={!shellVisible}
            importantForAccessibility={shellVisible ? "auto" : "no-hide-descendants"}
          >
            {bootError ? (
              <View style={styles.recovery}>
                <Image source={SPLASH_ASSETS.logo} style={styles.recoveryLogo} resizeMode="contain" />
                <Text style={styles.recoveryTitle}>Unable to finish startup</Text>
                <Text style={styles.recoveryMessage}>
                  The app could not load its startup services. Check the connection and try again.
                  {"\n\n"}
                  செயலியின் தொடக்க சேவைகளை ஏற்ற முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={retryProviderLoad}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Retry / மீண்டும் முயற்சி</Text>
                </Pressable>
              </View>
            ) : Providers ? (
              <Providers onCriticalReady={handleCriticalReady} />
            ) : null}
          </View>
        ) : null}

        {showSplash ? (
          <View style={styles.splashOverlay} pointerEvents="auto" collapsable={false}>
            <KavyaCinematicSplash
              key={splashKey}
              canExit={criticalReady}
              onExitStart={handleCinematicExitStart}
              onFinish={handleCinematicFinish}
              onReady={handleCinematicReady}
            />
          </View>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  shell: {
    flex: 1
  },
  shellHidden: {
    opacity: 0
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NATIVE_LAUNCH_BG,
    elevation: Platform.OS === "android" ? 1000 : 0,
    zIndex: 1000
  },
  recovery: {
    alignItems: "center",
    backgroundColor: APP_BG,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  recoveryLogo: {
    height: 88,
    width: 88
  },
  recoveryTitle: {
    color: "#0B3D2E",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 20,
    textAlign: "center"
  },
  recoveryMessage: {
    color: "#47645A",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center"
  },
  retryButton: {
    backgroundColor: "#0F6B43",
    borderRadius: 14,
    marginTop: 24,
    minWidth: 210,
    paddingHorizontal: 24,
    paddingVertical: 14
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  }
});
