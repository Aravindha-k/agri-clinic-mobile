import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppLanguage } from "../i18n";

const KEY = "app_preferences_v1";

export type AppPreferences = {
  autoSyncOnReconnect: boolean;
  wifiOnlySync: boolean;
  trackingBatterySaver: boolean;
  appLanguage: AppLanguage;
};

const DEFAULTS: AppPreferences = {
  autoSyncOnReconnect: true,
  wifiOnlySync: false,
  trackingBatterySaver: false,
  appLanguage: "en"
};

type AppPreferencesContextValue = AppPreferences & {
  ready: boolean;
  setPreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(undefined);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const setPreference = useCallback(async <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ...prefs, ready, setPreference }),
    [prefs, ready, setPreference]
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) throw new Error("useAppPreferences requires AppPreferencesProvider");
  return ctx;
}
