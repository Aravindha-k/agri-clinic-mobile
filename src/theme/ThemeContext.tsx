import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkTheme } from "./darkTheme";
import { lightTheme, type AppTheme } from "./lightTheme";

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<"light" | "dark" | null>(null);
  const isDark = override ? override === "dark" : system === "dark";
  const theme: AppTheme = isDark ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      theme,
      isDark,
      toggleTheme: () => setOverride((prev) => (prev === "dark" || (!prev && system === "dark") ? "light" : "dark"))
    }),
    [isDark, system, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: lightTheme, isDark: false, toggleTheme: () => {} };
  }
  return ctx;
}
