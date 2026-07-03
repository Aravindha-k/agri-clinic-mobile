import { useCallback, useEffect, useState, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KavyaCinematicSplash } from "./src/components/brand/KavyaCinematicSplash";
import { hideNativeSplashSafe, holdNativeSplash } from "./src/bootstrap/nativeSplash";
import { onSplashReplayRequested } from "./src/bootstrap/splashReplay";
import { logStartup, logStartupError } from "./src/utils/startupDiagnostics";

type ProvidersComponent = ComponentType<{ onShellReady?: () => void }>;

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashKey, setSplashKey] = useState(0);
  const [Providers, setProviders] = useState<ProvidersComponent | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    logStartup("first_render");
    void holdNativeSplash();

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
      setSplashVisible(true);
    });
  }, []);

  const handleCinematicReady = useCallback(() => {
    void hideNativeSplashSafe("cinematic_splash_ready");
  }, []);

  const handleCinematicFinish = useCallback(() => {
    setSplashVisible(false);
  }, []);

  const handleShellReady = useCallback(() => {
    void hideNativeSplashSafe("app_shell_ready");
  }, []);

  const showApp = Providers != null && !bootError;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {showApp ? <Providers onShellReady={handleShellReady} /> : bootError ? <View style={styles.root} /> : null}
        {splashVisible ? (
          <View style={styles.splashOverlay}>
            <KavyaCinematicSplash
              key={splashKey}
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
    flex: 1,
    backgroundColor: "#F8F7F2"
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject
  }
});
