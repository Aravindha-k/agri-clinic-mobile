import { useCallback, useEffect, useState, type ComponentType } from "react";
import { View, StyleSheet } from "react-native";
import { hideNativeSplashSafe, holdNativeSplash } from "./src/bootstrap/nativeSplash";
import { BootSplash } from "./src/components/brand/BootSplash";
import { logStartup, logStartupError } from "./src/utils/startupDiagnostics";

const NATIVE_SPLASH_HIDE_DELAY_MS = 120;

type ProvidersComponent = ComponentType<{ onShellReady?: () => void }>;

export default function App() {
  const [Providers, setProviders] = useState<ProvidersComponent | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [showBootOverlay, setShowBootOverlay] = useState(true);

  useEffect(() => {
    logStartup("first_render");
    void holdNativeSplash();

    const hideTimer = setTimeout(() => {
      void hideNativeSplashSafe("boot_fallback_visible");
    }, NATIVE_SPLASH_HIDE_DELAY_MS);

    void import("./AppProviders")
      .then((mod) => {
        setProviders(() => mod.default);
        logStartup("app_ready");
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        logStartupError(message);
        setBootError(message);
      });

    return () => clearTimeout(hideTimer);
  }, []);

  const handleShellReady = useCallback(() => {
    setShowBootOverlay(false);
    void hideNativeSplashSafe("app_shell_ready");
  }, []);

  return (
    <View style={styles.root}>
      {Providers ? <Providers onShellReady={handleShellReady} /> : null}
      {showBootOverlay ? <BootSplash error={bootError} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
