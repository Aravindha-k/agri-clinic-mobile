import { useMemo } from "react";
import { type TextStyle } from "react-native";
import { useI18n } from "../../src/i18n/I18nContext";
import { FontSize } from "../lib/theme";

/** Slightly larger line heights for Tamil outdoor readability. */
export function useLocaleTypography() {
  const { language } = useI18n();
  const isTamil = language === "ta";

  return useMemo(
    () => ({
      body: {
        fontSize: FontSize.body,
        lineHeight: isTamil ? 22 : 20
      } satisfies TextStyle,
      caption: {
        fontSize: FontSize.caption,
        lineHeight: isTamil ? 18 : 16
      } satisfies TextStyle,
      sectionTitle: {
        fontSize: FontSize.section,
        lineHeight: isTamil ? 24 : 22
      } satisfies TextStyle
    }),
    [isTamil]
  );
}
