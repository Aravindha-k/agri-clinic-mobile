import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useI18n } from "../../../src/i18n/I18nContext";
import {
  readLocationReadiness,
  type LocationReadiness
} from "../../../src/utils/workdayLocationGate";
import type { TrackingErrorSource } from "../../../src/types/trackingError";
import { PrimaryButton, GhostButton } from "../ui";
import { Colors, FontSize, FontWeight, Layout, Radius, Semantic, Spacing, TextStyles } from "../../lib/theme";
import type { WorkdaySessionStatus } from "../../../src/storage/workdaySessionStorage";

type Props = {
  workdayStatus: WorkdaySessionStatus;
  presentation?: "dashboard" | "tracking";
  hydrating?: boolean;
  active: boolean;
  busy: boolean;
  starting?: boolean;
  /** Overrides default starting label (e.g. Getting your location…). */
  startingLabel?: string | null;
  error?: string | null;
  errorSource?: TrackingErrorSource | null;
  onDismissError?: () => void;
  timerDisplay: string;
  startedAtLabel?: string | null;
  endedAtLabel?: string | null;
  distanceKm?: number;
  visitsToday?: number;
  pendingSync?: number;
  trackingActiveLabel?: string | null;
  onStart: () => void;
  onEnd?: () => void;
  ending?: boolean;
  onRetryStart?: () => void;
  onNewVisit?: () => void;
  onFarmers?: () => void;
  onMyRoute: () => void;
  onOpenTracking?: () => void;
  /** When false, hide New Visit / Farmers (Day tab). Default true. */
  showVisitActions?: boolean;
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
function formatCompactDuration(display?: string) {
  const [hh = "0", mm = "0"] = (display || "00:00:00").split(":");
  const hours = Number.parseInt(hh, 10) || 0;
  const minutes = Number.parseInt(mm, 10) || 0;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes}m`;
}

export function WorkdayStartPanel({
  workdayStatus,
  presentation = "tracking",
  hydrating = false,
  active,
  busy,
  starting = false,
  startingLabel,
  error,
  errorSource,
  onDismissError,
  timerDisplay,
  startedAtLabel,
  endedAtLabel,
  distanceKm = 0,
  visitsToday = 0,
  pendingSync = 0,
  trackingActiveLabel,
  onStart,
  onEnd,
  ending = false,
  onRetryStart,
  onNewVisit,
  onFarmers,
  onMyRoute,
  onOpenTracking,
  showVisitActions = true
}: Props) {
  const { t } = useI18n();
  const [readiness, setReadiness] = useState<LocationReadiness>("checking");
  const startBusy = busy || starting;
  const endBusy = busy || ending;
  const startButtonLabel = startBusy
    ? startingLabel || t("workdayUx.startingWorkday")
    : t("workdayUx.startWorkday");
  const isDashboard = presentation === "dashboard";
  const compactDuration = formatCompactDuration(timerDisplay);

  const statusMeta = (() => {
    switch (workdayStatus) {
      case "in_progress":
        return {
          label: t("workdayUx.statusWorking"),
          color: Colors.greenText,
          bg: Colors.greenBg
        };
      case "completed":
        return {
          label: t("workdayUx.statusCompleted"),
          color: Colors.brand700,
          bg: Colors.brand50
        };
      default:
        return {
          label: t("workdayUx.statusNotStarted"),
          color: Colors.text3,
          bg: Colors.bg
        };
    }
  })();

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

  if (hydrating) {
    if (isDashboard) {
      return (
        <View style={styles.card} accessibilityRole="summary">
          <Text style={styles.title}>{t("workdayUx.loadingWorkday")}</Text>
          <Text style={styles.helper}>{t("workdayUx.checkingWorkday")}</Text>
        </View>
      );
    }

    return (
      <View style={styles.card} accessibilityRole="summary">
        <Text style={styles.title}>{t("workdayUx.loadingWorkday")}</Text>
        <Text style={styles.helper}>{t("workdayUx.checkingWorkday")}</Text>
        <Text style={styles.timer}>--:--:--</Text>
        <Text style={styles.timerCaption}>{t("workdayUx.todaysWorkTime")}</Text>
      </View>
    );
  }

  if (!active) {
    const meta = readinessMeta(readiness, t);
    return (
      <View style={styles.card} accessibilityRole="summary">
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t("workdayUx.status")}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        {!isDashboard ? (
          <>
            <Text style={styles.timer} accessibilityLabel={t("workdayUx.todaysWorkTime")}>
              {timerDisplay || "00:00:00"}
            </Text>
            <Text style={styles.timerCaption}>{t("workdayUx.todaysWorkTime")}</Text>
          </>
        ) : null}

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
                  accessibilityLabel={t("workdayUx.tryAgain")}
                  style={styles.errorActionBtn}
                >
                  <Text style={styles.errorActionText}>{t("workdayUx.tryAgain")}</Text>
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
          label={startButtonLabel}
          onPress={onStart}
          loading={startBusy}
          disabled={startBusy || workdayStatus === "completed"}
          accessibilityLabel={startButtonLabel}
          style={styles.primaryBtn}
        />
      </View>
    );
  }

  if (workdayStatus === "completed" && isDashboard) {
    return (
      <View style={[styles.card, styles.cardActive]} accessibilityRole="summary">
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t("workdayUx.status")}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        <View style={styles.compactRows}>
          <View style={styles.compactRow}>
            <Text style={styles.compactLabel}>Worked</Text>
            <Text style={styles.compactValue}>{compactDuration}</Text>
          </View>
          {startedAtLabel ? (
            <View style={styles.compactRow}>
              <Text style={styles.compactLabel}>Start time</Text>
              <Text style={styles.compactValue}>{startedAtLabel}</Text>
            </View>
          ) : null}
          {endedAtLabel ? (
            <View style={styles.compactRow}>
              <Text style={styles.compactLabel}>End time</Text>
              <Text style={styles.compactValue}>{endedAtLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (workdayStatus === "completed") {
    return (
      <View style={[styles.card, styles.cardActive]} accessibilityRole="summary">
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t("workdayUx.status")}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        <Text style={styles.timer} accessibilityLabel={t("workdayUx.todaysWorkTime")}>
          {timerDisplay || "00:00:00"}
        </Text>
        <Text style={styles.timerCaption}>{t("workdayUx.todaysWorkTime")}</Text>

        {startedAtLabel ? (
          <Text style={styles.activeMeta}>
            {t("workdayUx.startedAt", { time: startedAtLabel })}
          </Text>
        ) : null}

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{distanceKm.toFixed(1)} km</Text>
            <Text style={styles.statLabel}>{t("home.distanceToday")}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{visitsToday}</Text>
            <Text style={styles.statLabel}>{t("home.visitsToday")}</Text>
          </View>
        </View>

        <PrimaryButton
          label={t("workdayUx.myRoute")}
          onPress={onMyRoute}
          disabled={busy}
          style={styles.primaryBtn}
          accessibilityLabel={t("workdayUx.myRoute")}
        />
      </View>
    );
  }

  if (isDashboard) {
    const openTracking = onOpenTracking ?? onMyRoute;
    return (
      <View style={[styles.card, styles.cardActive]} accessibilityRole="summary">
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t("workdayUx.status")}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        <View style={styles.compactRows}>
          {startedAtLabel ? (
            <View style={styles.compactRow}>
              <Text style={styles.compactLabel}>Started</Text>
              <Text style={styles.compactValue}>{startedAtLabel}</Text>
            </View>
          ) : null}
          <View style={styles.compactRow}>
            <Text style={styles.compactLabel}>Today's Work</Text>
            <Text style={styles.compactValue}>Active</Text>
          </View>
        </View>

        <Text style={styles.trackingLine}>
          {trackingActiveLabel ?? t("workdayUx.locationTrackingActive")}
        </Text>

        <PrimaryButton
          label="Open Tracking"
          onPress={openTracking}
          disabled={busy}
          style={styles.primaryBtn}
          accessibilityLabel="Open Tracking"
        />
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardActive]} accessibilityRole="summary">
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>{t("workdayUx.status")}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>
      </View>

      <View style={styles.activeHeader}>
        <View style={styles.activeDot} />
        <Text style={styles.activeTitle}>{t("workdayUx.workdayInProgress")}</Text>
      </View>

      {startedAtLabel ? (
        <Text style={styles.activeMeta}>
          {t("workdayUx.startedAt", { time: startedAtLabel })}
        </Text>
      ) : null}

      <Text style={styles.trackingLine}>
        {trackingActiveLabel ?? t("workdayUx.locationTrackingActive")}
      </Text>

      <Text style={styles.timer} accessibilityLabel={`${t("workdayUx.todaysWorkTime")} ${timerDisplay}`}>
        {timerDisplay}
      </Text>
      <Text style={styles.timerCaption}>{t("workdayUx.todaysWorkTime")}</Text>

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
            <Text style={styles.errorTitle}>
              {errorSource === "end_workday"
                ? t("workdayUx.couldNotEnd")
                : errorSource === "tracking"
                  ? t("workdayUx.locationSignalTitle")
                  : errorSource === "sync"
                    ? t("workdayUx.syncIssueTitle")
                    : t("workdayUx.couldNotStart")}
            </Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
          {onDismissError ? (
            <Pressable onPress={onDismissError} accessibilityRole="button" style={styles.errorActionBtn}>
              <Text style={styles.errorDismiss}>{t("common.cancel")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {onEnd ? (
        <GhostButton
          label={ending ? t("workdayUx.endingWorkday") : t("workdayUx.endWorkday")}
          onPress={onEnd}
          loading={endBusy}
          disabled={endBusy}
          style={styles.endBtn}
          accessibilityLabel={t("workdayUx.endWorkday")}
        />
      ) : null}

      {showVisitActions && onNewVisit ? (
        <PrimaryButton
          label={t("workdayUx.newVisit")}
          onPress={onNewVisit}
          disabled={busy}
          style={styles.primaryBtn}
          accessibilityLabel={t("workdayUx.newVisit")}
        />
      ) : null}

      {showVisitActions && onFarmers ? (
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
      ) : (
        <PrimaryButton
          label={t("workdayUx.myRoute")}
          onPress={onMyRoute}
          disabled={busy}
          style={styles.primaryBtn}
          accessibilityLabel={t("workdayUx.myRoute")}
        />
      )}
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
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  statusLabel: {
    ...TextStyles.caption,
    color: Semantic.textMuted,
    fontWeight: FontWeight.semibold
  },
  statusPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  statusPillText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold
  },
  timerCaption: {
    ...TextStyles.caption,
    color: Semantic.textMuted,
    marginTop: -Spacing.sm
  },
  endBtn: {
    alignSelf: "stretch",
    width: "100%"
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
  compactRows: {
    gap: Spacing.sm
  },
  compactRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 28
  },
  compactLabel: {
    ...TextStyles.caption,
    color: Semantic.textMuted,
    fontWeight: FontWeight.semibold
  },
  compactValue: {
    color: Semantic.textPrimary,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
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
