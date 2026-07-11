import { useCallback, useEffect, useState, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KavyaCinematicSplash } from "./src/components/brand/KavyaCinematicSplash";
import { CINEMATIC_SPLASH_BG } from "./src/components/brand/splashColors";
import { hideNativeSplashSafe, holdNativeSplash } from "./src/bootstrap/nativeSplash";
import { onSplashReplayRequested } from "./src/bootstrap/splashReplay";
import { logStartup, logStartupError } from "./src/utils/startupDiagnostics";
import { installGlobalErrorHandlers } from "./src/utils/globalErrorHandlers";

type ProvidersComponent = ComponentType;

/** Hard cap — splash never blocks the app beyond this. */
const SPLASH_MAX_MS = 3000;

/** App shell background after splash (matches login / theme). */
const APP_BG = "#F8F7F2";

/**
 * Startup state machine:
 * - cinematic: only branded splash (native splash already held)
 * - revealing: splash fading; app shell may mount underneath
 * - app: splash gone
 */
type StartupPhase = "cinematic" | "revealing" | "app";

export default function App() {
  const [phase, setPhase] = useState<StartupPhase>("cinematic");
  const [splashKey, setSplashKey] = useState(0);
  const [Providers, setProviders] = useState<ProvidersComponent | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    installGlobalErrorHandlers();
    logStartup("first_render");
    void holdNativeSplash();

    // Prefetch providers while cinematic plays — mount only when revealing/app.
    void import("./AppProviders")
      .then((mod) => {
        setProviders(() => mod.default);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        logStartupError(message);
        setBootError(message);
      });
  }, []);

  useEffect(() => {
    return onSplashReplayRequested((reason) => {
      logStartup("splash_replay", reason ?? "sign_out");
      setSplashKey((key) => key + 1);
      setPhase("cinematic");
    });
  }, []);

  const handleCinematicReady = useCallback(() => {
    // Hide native splash as soon as cinematic root has laid out — not after animation.
    void hideNativeSplashSafe("cinematic_first_layout");
  }, []);

  const handleCinematicExitStart = useCallback(() => {
    // Mount shell under the fade so login/home is ready when splash opacity hits 0.
    logStartup("app_ready", "cinematic_exit_start");
    setPhase("revealing");
  }, []);

  const handleCinematicFinish = useCallback(() => {
    logStartup("splash_end", "cinematic finished");
    setPhase("app");
  }, []);

  useEffect(() => {
    if (phase !== "cinematic") return;
    logStartup("splash_start");
    const timer = setTimeout(() => {
      logStartup("splash_timeout", `${SPLASH_MAX_MS}ms`);
      void hideNativeSplashSafe("splash_timeout");
      setPhase("app");
    }, SPLASH_MAX_MS);
    return () => clearTimeout(timer);
  }, [phase, splashKey]);

  const showSplash = phase === "cinematic" || phase === "revealing";
  const showShell = phase === "revealing" || phase === "app";
  const rootBg = showSplash ? CINEMATIC_SPLASH_BG : APP_BG;

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: rootBg }]}>
      <SafeAreaProvider>
        {showShell ? (
          bootError ? (
            <View style={[styles.root, { backgroundColor: APP_BG }]} />
          ) : Providers ? (
            <Providers />
          ) : (
            <View style={[styles.root, { backgroundColor: CINEMATIC_SPLASH_BG }]} />
          )
        ) : null}

        {showSplash ? (
          <View style={styles.splashOverlay} pointerEvents="auto">
            <KavyaCinematicSplash
              key={splashKey}
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
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100
  }
});
