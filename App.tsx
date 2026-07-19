import "react-native-reanimated";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppProviders from "./AppProviders";
import { KavyaCinematicSplash } from "./src/components/brand/KavyaCinematicSplash";
import { CompanyLogo } from "./src/components/brand/CompanyLogo";
import { SPLASH_ASSETS } from "./src/components/brand/splashAssets";
import { NATIVE_LAUNCH_BG } from "./src/components/brand/splashColors";
import { hideNativeSplashSafe, holdNativeSplash } from "./src/bootstrap/nativeSplash";
import { onSplashReplayRequested } from "./src/bootstrap/splashReplay";
import { markSplashUiReady, resetSplashUiReady } from "./src/bootstrap/splashUiGate";
import {
  STARTUP_TIMEOUTS,
  hasStartupCompleted,
  markAssetsLoaded,
  markStartupBegin,
  markStartupFailed
} from "./src/bootstrap/startupCoordinator";
import {
  classifyStartupError,
  getStartupErrorCopy,
  type StartupErrorCategory
} from "./src/bootstrap/startupErrors";
import { getApiBuildDiagnostics, getApiConfigError } from "./src/api/config";
import { logStartup, logStartupError } from "./src/utils/startupDiagnostics";
import { installGlobalErrorHandlers } from "./src/utils/globalErrorHandlers";

/** App shell background after splash (matches login / theme). */
const APP_BG = "#F8F7F2";

type StartupPhase = "cinematic" | "revealing" | "app";
/** Last-resort native splash hide if cinematic onReady never fires (OEM layout hangs). */
const NATIVE_SPLASH_FAILSAFE_MS = STARTUP_TIMEOUTS.nativeSplashFailsafeMs;

function preloadSplashAssets() {
  const bg = Image.resolveAssetSource(SPLASH_ASSETS.background);
  const logo = Image.resolveAssetSource(SPLASH_ASSETS.logo);
  return Promise.all([
    bg.uri ? Image.prefetch(bg.uri) : Promise.resolve(false),
    logo.uri ? Image.prefetch(logo.uri) : Promise.resolve(false)
  ])
    .then(() => {
      markAssetsLoaded("splash_branding");
    })
    .catch(() => {
      markAssetsLoaded("splash_branding_partial");
    });
}

function StartupConfigRecovery() {
  const diag = getApiBuildDiagnostics();
  const configError = getApiConfigError();
  const copy = getStartupErrorCopy("configuration_error");
  return (
    <View style={styles.recovery}>
      <CompanyLogo size={88} />
      <Text style={styles.recoveryTitle}>{copy.title}</Text>
      <Text style={styles.recoveryMessage}>
        {copy.message}
        {"\n\n"}
        {copy.messageTa}
      </Text>
      <Text style={styles.recoveryMeta}>
        Build {diag.appVersion} · {diag.gitCommit}
        {configError ? `\n${configError.code}` : ""}
      </Text>
    </View>
  );
}

function StartupFailureRecovery({
  category,
  onRetry
}: {
  category: StartupErrorCategory;
  onRetry: () => void;
}) {
  const copy = getStartupErrorCopy(category);
  return (
    <View style={styles.recovery}>
      <CompanyLogo size={88} />
      <Text style={styles.recoveryTitle}>{copy.title}</Text>
      <Text style={styles.recoveryMessage}>
        {copy.message}
        {"\n\n"}
        {copy.messageTa}
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry / மீண்டும் முயற்சி</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const startupConfigError = getApiConfigError();
  const [phase, setPhase] = useState<StartupPhase>("cinematic");
  const [splashKey, setSplashKey] = useState(0);
  const [bootError, setBootError] = useState<StartupErrorCategory | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [criticalReady, setCriticalReady] = useState(false);
  const [providersMounted, setProvidersMounted] = useState(false);
  const layoutAtRef = useRef<number | null>(null);
  const criticalReadyRef = useRef(false);
  const bootstrapGenerationRef = useRef(0);
  const bootstrapWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBootstrapWatchdog = useCallback(() => {
    if (bootstrapWatchdogRef.current != null) {
      clearTimeout(bootstrapWatchdogRef.current);
      bootstrapWatchdogRef.current = null;
    }
  }, []);

  useEffect(() => {
    installGlobalErrorHandlers();
    if (startupConfigError) {
      void hideNativeSplashSafe("config_error");
      logStartupError(`config:${startupConfigError.code}`);
      return;
    }
    markStartupBegin("App root");
    logStartup("first_render");
    // Static import: Metro must finish AppProviders before this module evaluates.
    logStartup("providers_module_ready", "static_import");
    void holdNativeSplash();
    void preloadSplashAssets();
    const failsafe = setTimeout(() => {
      void hideNativeSplashSafe("absolute_failsafe");
    }, NATIVE_SPLASH_FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, [startupConfigError]);

  /**
   * Bootstrap watchdog starts only after providers have mounted.
   * Never races Metro dynamic-import bundling (AppProviders is statically imported).
   */
  useEffect(() => {
    if (startupConfigError || !providersMounted || criticalReadyRef.current) return;
    if (hasStartupCompleted()) return;

    const generation = ++bootstrapGenerationRef.current;
    clearBootstrapWatchdog();

    if (__DEV__) {
      logStartup("providers_mounted", "dev_bootstrap_watch_soft");
      bootstrapWatchdogRef.current = setTimeout(() => {
        if (generation !== bootstrapGenerationRef.current) return;
        if (criticalReadyRef.current || hasStartupCompleted()) return;
        console.warn("[Startup] waiting_for_metro_bundle — critical bootstrap still pending (dev; not fatal)");
        logStartup("waiting_for_metro_bundle", "dev_soft_warn");
      }, STARTUP_TIMEOUTS.devSlowBootstrapWarnMs);
      return () => clearBootstrapWatchdog();
    }

    logStartup("bootstrapping", "release_watchdog_armed");
    bootstrapWatchdogRef.current = setTimeout(() => {
      if (generation !== bootstrapGenerationRef.current) return;
      if (criticalReadyRef.current || hasStartupCompleted() || bootError != null) return;
      logStartupError("Critical bootstrap did not complete before the release watchdog");
      markStartupFailed("critical_bootstrap", "release critical bootstrap timeout");
      setBootError("auth_bootstrap_error");
      // Allow splash to exit so the recovery UI is reachable.
      setCriticalReady(true);
    }, STARTUP_TIMEOUTS.criticalBootstrapMs);

    return () => clearBootstrapWatchdog();
  }, [bootstrapAttempt, bootError, clearBootstrapWatchdog, providersMounted, startupConfigError]);

  useEffect(() => {
    return onSplashReplayRequested((reason) => {
      logStartup("splash_replay", reason ?? "sign_out");
      resetSplashUiReady(reason ?? "sign_out");
      setSplashKey((key) => key + 1);
      setPhase("cinematic");
      setCriticalReady(false);
      criticalReadyRef.current = false;
      layoutAtRef.current = null;
      setBootError(null);
      // AppProviders already reported ready — re-arm canExit so splash is not stuck
      // waiting on a one-shot firedRef that will not fire again.
      setTimeout(() => {
        criticalReadyRef.current = true;
        setCriticalReady(true);
        logStartup("providers_ready", "splash_replay_rearmed");
      }, 50);
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

  const handleProvidersMounted = useCallback(() => {
    setProvidersMounted(true);
    logStartup("providers_mounted");
  }, []);

  const handleCriticalReady = useCallback(() => {
    if (criticalReadyRef.current) return;
    criticalReadyRef.current = true;
    clearBootstrapWatchdog();
    setBootError(null);
    setCriticalReady(true);
    logStartup("providers_ready", `${elapsed()} ms`);
  }, [clearBootstrapWatchdog, elapsed]);

  const handleProvidersFatal = useCallback((error: unknown) => {
    if (criticalReadyRef.current || hasStartupCompleted()) return;
    const message = error instanceof Error ? error.message : String(error);
    const category = classifyStartupError(message);
    logStartupError(message);
    markStartupFailed("providers_runtime", message);
    clearBootstrapWatchdog();
    setBootError(category);
    setCriticalReady(true);
  }, [clearBootstrapWatchdog]);

  const handleCinematicExitStart = useCallback(() => {
    logStartup("app_ready", `exit_started ${elapsed()} ms`);
    setPhase("revealing");
  }, [elapsed]);

  const handleCinematicFinish = useCallback(() => {
    logStartup("app_revealed", `${elapsed()} ms`);
    logStartup("splash_end", `${elapsed()} ms`);
    markSplashUiReady("cinematic_finish");
    setPhase("app");
  }, [elapsed]);

  const retryBootstrap = useCallback(() => {
    clearBootstrapWatchdog();
    bootstrapGenerationRef.current += 1;
    resetSplashUiReady("bootstrap_retry");
    setBootError(null);
    setCriticalReady(false);
    criticalReadyRef.current = false;
    setProvidersMounted(false);
    setPhase("cinematic");
    layoutAtRef.current = null;
    setSplashKey((key) => key + 1);
    setBootstrapAttempt((attempt) => attempt + 1);
    logStartup("bootstrapping", "retry_requested");
  }, [clearBootstrapWatchdog]);

  const showSplash = phase === "cinematic" || phase === "revealing";
  /**
   * Keep auth/home shell fully hidden until splash finishes.
   * Revealing must not show Login/Biometric under the fade — fingerprint
   * system dialogs ignore React opacity and would steal the splash.
   */
  const shellVisible = phase === "app";
  const rootBg = showSplash ? NATIVE_LAUNCH_BG : APP_BG;

  if (startupConfigError) {
    return (
      <GestureHandlerRootView style={[styles.root, { backgroundColor: APP_BG }]}>
        <SafeAreaProvider>
          <StartupConfigRecovery />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: rootBg }]}>
      <SafeAreaProvider>
        <View
          style={[styles.shell, !shellVisible && styles.shellHidden]}
          pointerEvents={shellVisible ? "auto" : "none"}
          accessibilityElementsHidden={!shellVisible}
          importantForAccessibility={shellVisible ? "auto" : "no-hide-descendants"}
        >
          {bootError ? (
            <StartupFailureRecovery category={bootError} onRetry={retryBootstrap} />
          ) : (
            <AppProviders
              key={bootstrapAttempt}
              onShellReady={handleProvidersMounted}
              onCriticalReady={handleCriticalReady}
              onFatalError={handleProvidersFatal}
            />
          )}
        </View>

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
  recoveryMeta: {
    color: "#7A8F86",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
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
