import { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { readLocationReadiness, type LocationReadiness } from "../../../src/utils/workdayLocationGate";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  gpsEnabled?: boolean;
  permissionDenied?: boolean;
};

function readinessLabel(readiness: LocationReadiness, t: (key: string) => string): string | null {
  switch (readiness) {
    case "ready":
      return t("daySummary.gpsActive");
    case "services_off":
      return t("workdayUx.gpsOff");
    case "permission_required":
    case "permission_blocked":
      return t("workdayUx.locationRequiredShort");
    case "unavailable":
      return t("workdayUx.unableToGetLocation");
    default:
      return null;
  }
}

function readinessStyle(readiness: LocationReadiness) {
  if (readiness === "ready") {
    return { bg: Colors.greenBg, border: Colors.green, text: Colors.greenText };
  }
  if (readiness === "services_off") {
    return { bg: Colors.amberBg, border: Colors.amber, text: Colors.amberText };
  }
  return { bg: Colors.redBg, border: Colors.red, text: Colors.redText };
}

export function GpsStatusBadge({ gpsEnabled = true, permissionDenied }: Props) {
  const { t } = useI18n();
  const [readiness, setReadiness] = useState<LocationReadiness>("checking");

  const refresh = useCallback(async () => {
    setReadiness("checking");
    const next = await readLocationReadiness();
    setReadiness(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  if (readiness === "checking") return null;

  const effectiveReadiness: LocationReadiness =
    permissionDenied && readiness !== "ready" ? "permission_blocked" : !gpsEnabled ? "services_off" : readiness;

  const label = readinessLabel(effectiveReadiness, t);
  if (!label) return null;

  const palette = readinessStyle(effectiveReadiness);
  const accessibilityLabel = effectiveReadiness === "ready" ? t("a11y.gpsActive") : label;

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  text: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold
  }
});
