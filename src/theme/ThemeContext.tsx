import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkTheme } from "./darkTheme";
import { lightTheme, type AppTheme } from "./lightTheme";

const DARK_MODE_PREF_KEY = "dark_mode_pref";

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem(DARK_MODE_PREF_KEY)
      .then((raw) => {
        if (raw === "1") setOverride("dark");
        else if (raw === "0") setOverride("light");
      })
      .catch(() => undefined);
  }, []);

  const isDark = override ? override === "dark" : system === "dark";
  const theme: AppTheme = isDark ? darkTheme : lightTheme;

  const setDarkMode = useCallback((enabled: boolean) => {
    const next = enabled ? "dark" : "light";
    setOverride(next);
    void AsyncStorage.setItem(DARK_MODE_PREF_KEY, enabled ? "1" : "0").catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      toggleTheme,
      setDarkMode
    }),
    [isDark, setDarkMode, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: lightTheme, isDark: false, toggleTheme: () => {}, setDarkMode: () => {} };
  }
  return ctx;
}
