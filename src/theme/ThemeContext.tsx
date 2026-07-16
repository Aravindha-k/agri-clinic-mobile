import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { lightTheme, type AppTheme } from "./lightTheme";

const DARK_MODE_PREF_KEY = "dark_mode_pref";

/**
 * Active V2 mobile is light-theme only (Phase 7E).
 * Dark mode is not partially implemented — system dark must not flip field UI.
 * `toggleTheme` / `setDarkMode` are no-ops retained for API compatibility.
 */
type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
  /** Documented light-only scope for Settings copy. */
  lightOnly: true;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Clear any legacy dark preference so OEM/system dark cannot resurface later.
    void AsyncStorage.setItem(DARK_MODE_PREF_KEY, "0").catch(() => undefined);
  }, []);

  const setDarkMode = useCallback((_enabled: boolean) => {
    // Dark mode intentionally unsupported in active V2.
  }, []);

  const toggleTheme = useCallback(() => {
    // no-op
  }, []);

  const value = useMemo(
    () =>
      ({
        theme: lightTheme,
        isDark: false,
        toggleTheme,
        setDarkMode,
        lightOnly: true as const
      }) satisfies ThemeContextValue,
    [setDarkMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: lightTheme,
      isDark: false,
      toggleTheme: () => {},
      setDarkMode: () => {},
      lightOnly: true as const
    };
  }
  return ctx;
}
