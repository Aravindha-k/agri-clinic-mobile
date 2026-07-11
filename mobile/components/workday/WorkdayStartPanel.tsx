import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useI18n } from "../../../src/i18n/I18nContext";
import {
  readLocationReadiness,
  type LocationReadiness
} from "../../../src/utils/workdayLocationGate";
import { PrimaryButton, GhostButton } from "../ui";
import { Colors, FontSize, FontWeight, Layout, Radius, Semantic, Spacing, TextStyles } from "../../lib/theme";

type Props = {
  active: boolean;
  busy: boolean;
  starting?: boolean;
  error?: string | null;
  onDismissError?: () => void;
  timerDisplay: string;
  startedAtLabel?: string | null;
  distanceKm?: number;
  visitsToday?: number;
  pendingSync?: number;
  trackingActiveLabel?: string | null;
  onStart: () => void;
  onEnd?: () => void;
  onRetryStart?: () => void;
  onNewVisit: () => void;
  onFarmers: () => void;
  onMyRoute: () => void;
};

function readinessMeta(
  state: LocationReadiness,
  t: (k: string) => string
): { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string } {
  switch (state) {
    case "ready":
      return {
        icon: "checkmark-circle",
        label: t("workdayUx.locationReady"),
        color: Colors.greenText,
        bg: Colors.greenBg
      };
    case "permission_required":
      return {
        icon: "alert-circle",
        label: t("workdayUx.locationPermissionRequired"),
        color: Colors.amberText,
        bg: Colors.amberBg
      };
    case "permission_blocked":
      return {
        icon: "alert-circle",
        label: t("workdayUx.locationPermissionRequired"),
        color: Colors.amberText,
        bg: Colors.amberBg
      };
    case "services_off":
      return {
        icon: "navigate-circle-outline",
        label: t("workdayUx.turnOnDeviceLocation"),
        color: Colors.amberText,
        bg: Colors.amberBg
      };
    case "unavailable":
      return {
        icon: "warning-outline",
        label: t("workdayUx.unableToGetLocation"),
        color: Colors.redText,
        bg: Colors.redBg
      };
    case "checking":
    default:
      return {
        icon: "hourglass-outline",
        label: t("workdayUx.checkingLocation"),
        color: Colors.text3,
        bg: Colors.brand50
      };
  }
}

/**
 * Solid, outdoor-readable Start / Active workday panel — primary Today/Day CTA.
 */
export function WorkdayStartPanel({
  active,
  busy,
  starting = false,
  error,
  onDismissError,
  timerDisplay,
  startedAtLabel,
  distanceKm = 0,
  visitsToday = 0,
  pendingSync = 0,
  trackingActiveLabel,
  onStart,
  onEnd,
  onRetryStart,
  onNewVisit,
  onFarmers,
  onMyRoute
}: Props) {
  const { t } = useI18n();
  const [readiness, setReadiness] = useState<LocationReadiness>("checking");
  const startBusy = busy || starting;

  const refreshReadiness = useCallback(async () => {
    setReadiness("checking");
    const next = await readLocationReadiness();
    setReadiness(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshReadiness();
    }, [refreshReadiness])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshReadiness();
    });
    return () => sub.remove();
  }, [refreshReadiness]);

  if (!active) {
    const meta = readinessMeta(readiness, t);
    return (
      <View style={styles.card} accessibilityRole="summary">
        <Text style={styles.title}>{t("workdayUx.startYourWorkday")}</Text>
        <Text style={styles.helper}>{t("workdayUx.startHelper")}</Text>

        <View
          style={[styles.readinessRow, { backgroundColor: meta.bg }]}
          accessibilityRole="text"
          accessibilityLabel={meta.label}
        >
          <Ionicons name={meta.icon} size={18} color={meta.color} />
          <Text style={[styles.readinessText, { color: meta.color }]}>{meta.label}</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner} accessibilityLiveRegion="polite">
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>{t("workdayUx.couldNotStart")}</Text>
              <Text style={styles.errorBody}>{error}</Text>
            </View>
            <View style={styles.errorActions}>
              {onRetryStart ? (
                <Pressable
                  onPress={onRetryStart}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.retry")}
                  style={styles.errorActionBtn}
                >
                  <Text style={styles.errorActionText}>{t("common.retry")}</Text>
                </Pressable>
              ) : null}
              {onDismissError ? (
                <Pressable
                  onPress={onDismissError}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.cancel")}
                  style={styles.errorActionBtn}
                >
                  <Text style={styles.errorDismiss}>{t("common.cancel")}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <PrimaryButton
          label={startBusy ? t("workdayUx.startingWorkday") : t("workdayUx.startWorkday")}
          onPress={onStart}
          loading={startBusy}
          disabled={startBusy}
          accessibilityLabel={startBusy ? t("workdayUx.startingWorkday") : t("workdayUx.startWorkday")}
          style={styles.primaryBtn}
        />
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardActive]} accessibilityRole="summary">
      <View style={styles.activeHeader}>
        <View style={styles.activeDot} />
        <Text style={styles.activeTitle}>{t("workdayUx.workdayActive")}</Text>
      </View>

      {startedAtLabel ? (
        <Text style={styles.activeMeta}>
          {t("workdayUx.startedAt", { time: startedAtLabel })}
        </Text>
      ) : null}

      <Text style={styles.trackingLine}>
        {trackingActiveLabel ?? t("workdayUx.locationTrackingActive")}
      </Text>

      <Text style={styles.timer} accessibilityLabel={`${t("workdayUx.workdayActive")} ${timerDisplay}`}>
        {timerDisplay}
      </Text>

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{distanceKm.toFixed(1)} km</Text>
          <Text style={styles.statLabel}>{t("home.distanceToday")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{visitsToday}</Text>
          <Text style={styles.statLabel}>{t("home.visitsToday")}</Text>
        </View>
        {pendingSync > 0 ? (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{pendingSync}</Text>
            <Text style={styles.statLabel}>{t("workdayUx.pendingSync")}</Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="polite">
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{t("workdayUx.couldNotEnd")}</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
          {onDismissError ? (
            <Pressable onPress={onDismissError} accessibilityRole="button" style={styles.errorActionBtn}>
              <Text style={styles.errorDismiss}>{t("common.cancel")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <PrimaryButton
        label={t("workdayUx.newVisit")}
        onPress={onNewVisit}
        disabled={busy}
        style={styles.primaryBtn}
        accessibilityLabel={t("workdayUx.newVisit")}
      />

      <View style={styles.secondaryRow}>
        <GhostButton
          label={t("workdayUx.farmers")}
          onPress={onFarmers}
          disabled={busy}
          style={styles.secondaryBtn}
          accessibilityLabel={t("workdayUx.farmers")}
        />
        <GhostButton
          label={t("workdayUx.myRoute")}
          onPress={onMyRoute}
          disabled={busy}
          style={styles.secondaryBtn}
          accessibilityLabel={t("workdayUx.myRoute")}
        />
      </View>

      {onEnd ? (
        <Pressable
          onPress={onEnd}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t("daySummary.endWorkday")}
          accessibilityState={{ disabled: busy }}
          style={({ pressed }) => [styles.endLink, (pressed || busy) && { opacity: 0.7 }]}
        >
          <Text style={styles.endLinkText}>{t("daySummary.endWorkday")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    marginHorizontal: Spacing.screen,
    padding: Spacing.lg
  },
  cardActive: {
    borderColor: Colors.brand100
  },
  title: {
    ...TextStyles.h2,
    color: Semantic.textPrimary
  },
  helper: {
    ...TextStyles.body,
    color: Semantic.textMuted
  },
  readinessRow: {
    alignItems: "center",
    borderRadius: Radius.inner,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm
  },
  readinessText: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  },
  primaryBtn: {
    alignSelf: "stretch",
    width: "100%"
  },
  activeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm
  },
  activeDot: {
    backgroundColor: Colors.green,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  activeTitle: {
    ...TextStyles.h3,
    color: Semantic.textPrimary
  },
  activeMeta: {
    ...TextStyles.caption,
    color: Semantic.textMuted
  },
  trackingLine: {
    ...TextStyles.small,
    color: Colors.greenText,
    fontWeight: FontWeight.semibold
  },
  timer: {
    color: Semantic.textPrimary,
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5
  },
  statRow: {
    flexDirection: "row",
    gap: Spacing.sm
  },
  stat: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.inner,
    flex: 1,
    gap: 2,
    minWidth: 0,
    padding: Spacing.md
  },
  statValue: {
    color: Semantic.textPrimary,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold
  },
  statLabel: {
    color: Semantic.textMuted,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  },
  secondaryRow: {
    flexDirection: "row",
    gap: Spacing.sm
  },
  secondaryBtn: {
    flex: 1,
    minWidth: 0
  },
  endLink: {
    alignItems: "center",
    minHeight: Layout.touchTargetMin,
    justifyContent: "center"
  },
  endLinkText: {
    color: Colors.redText,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  },
  errorBanner: {
    backgroundColor: Colors.redBg,
    borderColor: Colors.red,
    borderRadius: Radius.inner,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    padding: Spacing.md
  },
  errorCopy: {
    gap: 4
  },
  errorTitle: {
    color: Colors.redText,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  },
  errorBody: {
    color: Colors.redText,
    fontSize: FontSize.caption,
    lineHeight: 18
  },
  errorActions: {
    flexDirection: "row",
    gap: Spacing.md
  },
  errorActionBtn: {
    minHeight: Layout.touchTargetMin,
    justifyContent: "center",
    paddingRight: Spacing.sm
  },
  errorActionText: {
    color: Colors.brand700,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  },
  errorDismiss: {
    color: Colors.text3,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  }
});
