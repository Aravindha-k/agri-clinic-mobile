import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KavyaCinematicSplash } from "./src/components/brand/KavyaCinematicSplash";
import { CINEMATIC_SPLASH_BG } from "./src/components/brand/splashColors";
import { hideNativeSplashSafe, holdNativeSplash } from "./src/bootstrap/nativeSplash";
import { onSplashReplayRequested } from "./src/bootstrap/splashReplay";
import { logStartup, logStartupError } from "./src/utils/startupDiagnostics";
import { installGlobalErrorHandlers } from "./src/utils/globalErrorHandlers";

type ProvidersComponent = ComponentType<{ onCriticalReady?: () => void }>;

/** App shell background after splash (matches login / theme). */
const APP_BG = "#F8F7F2";

type StartupPhase = "cinematic" | "revealing" | "app";

export default function App() {
  const [phase, setPhase] = useState<StartupPhase>("cinematic");
  const [splashKey, setSplashKey] = useState(0);
  const [Providers, setProviders] = useState<ProvidersComponent | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [criticalReady, setCriticalReady] = useState(false);
  const layoutAtRef = useRef<number | null>(null);

  useEffect(() => {
    installGlobalErrorHandlers();
    logStartup("first_render");
    void holdNativeSplash();

    void import("./AppProviders")
      .then((mod) => {
        setProviders(() => mod.default);
        logStartup("providers_module_ready");
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        logStartupError(message);
        setBootError(message);
        setCriticalReady(true);
      });
  }, []);

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

  /** Native splash hides only after cinematic first layout + animation kickoff. */
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

  const showSplash = phase === "cinematic" || phase === "revealing";
  const showShell = Providers != null || bootError != null;
  /** Keep providers mounted for auth/fonts, but hide until exit fade so native screens cannot cover splash. */
  const shellVisible = phase === "revealing" || phase === "app";
  const rootBg = showSplash ? CINEMATIC_SPLASH_BG : APP_BG;

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
              <View style={[styles.root, { backgroundColor: APP_BG }]} />
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
    backgroundColor: CINEMATIC_SPLASH_BG,
    elevation: Platform.OS === "android" ? 1000 : 0,
    zIndex: 1000
  }
});
