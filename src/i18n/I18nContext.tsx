import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useAppPreferences } from "../storage/AppPreferencesContext";
import { translate, type AppLanguage } from "./index";

type I18nContextValue = {
  language: AppLanguage;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLanguage: (lang: AppLanguage) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { appLanguage, setPreference } = useAppPreferences();
  const language = appLanguage;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(language, key, params),
    [language]
  );

  const setLanguage = useCallback(
    async (lang: AppLanguage) => {
      await setPreference("appLanguage", lang);
    },
    [setPreference]
  );

  const value = useMemo(
    () => ({ language, t, setLanguage }),
    [language, t, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n requires I18nProvider");
  return ctx;
}
