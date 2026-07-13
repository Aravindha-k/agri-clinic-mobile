import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { VisitFlowParamList } from "../../../src/navigation/types";
import { resetToMainTab, resetToVisitDetail } from "../../../src/navigation/rootNavigationRef";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import type { SubmittedVisitSummary } from "../../../src/types/submittedVisitSummary";
import { beginNewVisit } from "../../lib/beginNewVisit";
import { GhostButton, PrimaryButton } from "../../components/ui";
import { EntranceBlocks } from "../../components/ui/EntranceBlocks";
import { FlatCard, ScreenEntranceShell } from "../../components/layout";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../../lib/theme";

type Props = NativeStackScreenProps<VisitFlowParamList, "VisitSuccess">;

function AnimatedHeroIcon({ queued }: { queued: boolean }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.2, { duration: 200 }), withTiming(1, { duration: 200 }));
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={[styles.heroWrap, animatedStyle]}>
      <View
        style={[
          styles.heroCircle,
          { backgroundColor: queued ? Colors.amberBg : Colors.brand50 }
        ]}
      >
        <Ionicons
          name={queued ? "time-outline" : "checkmark"}
          size={44}
          color={queued ? Colors.amber : Colors.brand700}
        />
      </View>
    </Animated.View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function gpsLabelFromSummary(
  summary: SubmittedVisitSummary,
  t: (key: string) => string
): string {
  switch (summary.gpsStatus) {
    case "captured":
      return t("visitFlow.gpsConfirmed");
    case "pending":
      return t("visitFlow.gpsPending");
    default:
      return t("visitFlow.gpsNotCaptured");
  }
}

export default function VisitSuccessScreen({ navigation, route }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const summary = route.params.summary;
  const { visitId, queued, evidenceWarning } = summary;

  const { pendingCount, refreshQueue } = useOfflineSync();

  useEffect(() => {
    if (!queued) return;
    void refreshQueue();
  }, [queued, refreshQueue]);

  function goHome() {
    resetToMainTab("Today");
  }

  function viewVisit() {
    if (!visitId || visitId <= 0) return;
    resetToVisitDetail(visitId, true);
  }

  function viewPendingVisits() {
    resetToMainTab("Work", { screen: "WorkHome", params: { segment: "visits" } });
  }

  function addAnotherVisit() {
    beginNewVisit();
    navigation.reset({
      index: 0,
      routes: [{ name: "NewVisitFarmer", params: { fresh: true } }]
    });
  }

  const farmerLabel = summary.farmerName?.trim() || "—";
  const cropLabel = summary.cropName?.trim() || "—";
  const problemLabel = summary.problemText?.trim() || "—";
  const adviceLabel =
    summary.recommendationText?.trim() ||
    summary.observationText?.trim() ||
    "";
  const gpsLabel = gpsLabelFromSummary(summary, t);

  return (
    <ScreenEntranceShell style={styles.screen}>
      {(entranceTick) => (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: Math.max(insets.bottom, 24) + Layout.stackScrollBottom }
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <EntranceBlocks replayKey={entranceTick} startStep={0} variant="card">
            <AnimatedHeroIcon queued={Boolean(queued)} />

            {queued ? (
              <>
                <Text style={styles.title}>{t("visitFlow.savedForSync")}</Text>
                <Text style={styles.subtitle}>{t("visitFlow.willUploadWhenConnected")}</Text>
                <Text style={styles.pendingCount}>
                  {t(pendingCount === 1 ? "visitFlow.visitsInQueue" : "visitFlow.visitsInQueue_plural", {
                    count: pendingCount
                  })}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>{t("visitFlow.visitSubmitted")}</Text>
                {visitId > 0 ? (
                  <Text style={styles.visitId}>{t("visitFlow.visitNumber", { id: visitId })}</Text>
                ) : null}
                <FlatCard style={styles.summaryCard}>
                  <View style={styles.summaryInner}>
                    <SummaryRow label={t("visitFlow.farmerSummary")} value={farmerLabel} />
                    <View style={styles.summaryDivider} />
                    <SummaryRow label={t("visitFlow.cropSummary")} value={cropLabel} />
                    <View style={styles.summaryDivider} />
                    <SummaryRow label={t("visitFlow.problemSummary")} value={problemLabel} />
                    {adviceLabel ? (
                      <>
                        <View style={styles.summaryDivider} />
                        <SummaryRow label={t("visitFlow.adviceSummary")} value={adviceLabel} />
                      </>
                    ) : null}
                    <View style={styles.summaryDivider} />
                    <SummaryRow label={t("visitFlow.gpsSummary")} value={gpsLabel} />
                  </View>
                </FlatCard>
                {evidenceWarning ? <Text style={styles.evidenceWarn}>{evidenceWarning}</Text> : null}
              </>
            )}

            <View style={styles.actions}>
              <PrimaryButton
                label={t("visitFlow.addAnotherVisit")}
                onPress={addAnotherVisit}
                style={styles.actionBtn}
              />
              {queued ? (
                <GhostButton
                  label={t("visitFlow.viewPendingVisits")}
                  onPress={viewPendingVisits}
                  style={styles.actionBtn}
                />
              ) : visitId > 0 ? (
                <GhostButton label={t("visitFlow.viewVisit")} onPress={viewVisit} style={styles.actionBtn} />
              ) : null}
              {!queued ? (
                <Pressable onPress={goHome} style={styles.homeLink} accessibilityRole="button">
                  <Text style={styles.homeLinkText}>{t("visitFlow.goHome")}</Text>
                </Pressable>
              ) : null}
            </View>
          </EntranceBlocks>
        </ScrollView>
      )}
    </ScreenEntranceShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  body: {
    alignItems: "stretch",
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.screen,
    paddingTop: 24,
    width: "100%"
  },
  heroWrap: {
    alignItems: "center",
    alignSelf: "center",
    height: 100,
    justifyContent: "center",
    width: 100
  },
  heroCircle: {
    alignItems: "center",
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    width: 80
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    marginTop: 16,
    textAlign: "center"
  },
  subtitle: {
    color: Colors.text3,
    fontSize: FontSize.md,
    marginTop: 8,
    textAlign: "center"
  },
  pendingCount: {
    color: Colors.amber,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: 12,
    textAlign: "center"
  },
  visitId: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    marginTop: 6,
    textAlign: "center"
  },
  summaryCard: {
    alignSelf: "stretch",
    marginTop: 20,
    width: "100%"
  },
  summaryInner: {
    gap: 0,
    padding: Spacing.md
  },
  summaryRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.md,
    paddingVertical: Spacing.sm
  },
  summaryLabel: {
    color: Colors.text3,
    flexShrink: 0,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: 22,
    minWidth: 88,
    width: 88
  },
  summaryValue: {
    color: Colors.text1,
    flex: 1,
    flexShrink: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    lineHeight: 22
  },
  summaryDivider: {
    backgroundColor: Colors.border,
    height: StyleSheet.hairlineWidth
  },
  evidenceWarn: {
    alignSelf: "stretch",
    backgroundColor: Colors.amberBg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: Colors.amber,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 12,
    padding: 12,
    textAlign: "center"
  },
  actions: {
    alignSelf: "stretch",
    gap: Spacing.sm,
    marginTop: 24
  },
  actionBtn: {
    minHeight: Layout.touchTargetMin,
    width: "100%"
  },
  homeLink: {
    alignItems: "center",
    minHeight: Layout.touchTargetMin,
    justifyContent: "center",
    paddingVertical: Spacing.sm
  },
  homeLinkText: {
    color: Colors.brand700,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  }
});
