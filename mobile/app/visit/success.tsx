import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { VisitFlowParamList } from "../../../src/navigation/types";
import { getQueuedVisits } from "../../../src/storage/offlineVisitQueue";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useVisitFormStore } from "../../store/visitFormStore";
import { GhostButton, PrimaryButton } from "../../components/ui";
import { ScreenBackground } from "../../../src/components/glass";
import GlassCard from "../../../src/components/glass/GlassCard";
import { ENT } from "../../../src/theme/enterprise";
import { FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

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
          { backgroundColor: queued ? ENT.warningSoft : ENT.primarySoft }
        ]}
      >
        <Ionicons
          name={queued ? "time-outline" : "checkmark"}
          size={44}
          color={queued ? ENT.warning : ENT.primary}
        />
      </View>
    </Animated.View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function VisitSuccessScreen({ navigation, route }: Props) {
  const { t } = useI18n();
  const {
    visitId,
    queued,
    evidenceWarning,
    farmerName,
    savedCrop,
    savedProblemSeen,
    savedRecommendation,
    savedActionTaken,
    gpsConfirmed
  } = route.params;

  const reset = useVisitFormStore((s) => s.reset);
  const [pendingCount, setPendingCount] = useState(queued ? 1 : 0);

  useEffect(() => {
    if (!queued) return;
    void getQueuedVisits().then((items) => setPendingCount(items.length));
  }, [queued]);

  function exitToMain() {
    const root = navigation.getParent();
    if (root?.canGoBack()) root.goBack();
  }

  function goHome() {
    navigation.getParent()?.navigate("Main", { screen: "Home" });
    exitToMain();
  }

  function viewVisit() {
    if (!visitId || visitId <= 0) return;
    navigation.getParent()?.navigate("Main", {
      screen: "Visits",
      params: { screen: "VisitDetail", params: { id: visitId, fromSubmit: true } }
    });
    exitToMain();
  }

  function viewPendingVisits() {
    navigation.getParent()?.navigate("Main", {
      screen: "Visits",
      params: { screen: "VisitsList" }
    });
    exitToMain();
  }

  function addAnotherVisit() {
    reset();
    navigation.reset({
      index: 0,
      routes: [{ name: "NewVisitFarmer", params: { fresh: true } }]
    });
  }

  const farmerLabel = farmerName?.trim() || "—";
  const cropLabel = savedCrop?.trim() || "—";
  const problemLabel = savedProblemSeen?.trim() || "—";
  const adviceLabel = savedRecommendation?.trim() || savedActionTaken?.trim() || "";
  const gpsLabel = gpsConfirmed ? t("visitFlow.gpsConfirmed") : t("visitFlow.gpsNotCaptured");

  return (
    <View style={styles.screen}>
      <ScreenBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
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
            <GlassCard style={styles.summaryGlow}>
            <View style={styles.summaryCard}>
              <SummaryLine label={t("visitFlow.farmerSummary")} value={farmerLabel} />
              <SummaryLine label={t("visitFlow.cropSummary")} value={cropLabel} />
              <SummaryLine label={t("visitFlow.problemSummary")} value={problemLabel} />
              {adviceLabel ? <SummaryLine label={t("visitFlow.adviceSummary")} value={adviceLabel} /> : null}
              <SummaryLine label={t("visitFlow.gpsSummary")} value={gpsLabel} />
            </View>
            </GlassCard>
            {evidenceWarning ? <Text style={styles.evidenceWarn}>{evidenceWarning}</Text> : null}
          </>
        )}

        <View style={styles.actions}>
          <PrimaryButton label={t("visitFlow.addAnotherVisit")} onPress={addAnotherVisit} style={styles.actionBtn} />
          {queued ? (
            <GhostButton label={t("visitFlow.viewPendingVisits")} onPress={viewPendingVisits} style={styles.actionBtn} />
          ) : visitId > 0 ? (
            <GhostButton label={t("visitFlow.viewVisit")} onPress={viewVisit} style={styles.actionBtn} />
          ) : null}
          {!queued ? (
            <Pressable onPress={goHome} style={styles.homeLink}>
              <Text style={styles.homeLinkText}>{t("visitFlow.goHome")}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: ENT.bg,
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  body: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 32,
    paddingHorizontal: Spacing.screen,
    paddingTop: 24
  },
  heroWrap: {
    alignItems: "center",
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
    color: ENT.text,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    marginTop: 16,
    textAlign: "center"
  },
  subtitle: {
    color: ENT.textSecondary,
    fontSize: FontSize.md,
    marginTop: 8,
    textAlign: "center"
  },
  pendingCount: {
    color: ENT.warning,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: 12,
    textAlign: "center"
  },
  visitId: {
    color: ENT.textMuted,
    fontSize: FontSize.sm,
    marginTop: 6,
    textAlign: "center"
  },
  summaryGlow: {
    alignSelf: "stretch",
    marginTop: 20
  },
  summaryCard: {
    alignSelf: "stretch",
    gap: 10,
    padding: 16
  },
  summaryLine: {
    flexDirection: "row",
    gap: 10
  },
  summaryLabel: {
    color: ENT.textSecondary,
    fontSize: FontSize.sm,
    minWidth: 64
  },
  summaryValue: {
    color: ENT.text,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  evidenceWarn: {
    alignSelf: "stretch",
    backgroundColor: ENT.warningSoft,
    borderColor: ENT.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: ENT.warning,
    fontSize: FontSize.sm,
    marginTop: 12,
    padding: 12,
    textAlign: "center"
  },
  actions: {
    alignSelf: "stretch",
    gap: 10,
    marginTop: 24
  },
  actionBtn: {
    width: "100%"
  },
  homeLink: {
    alignItems: "center",
    paddingVertical: 10
  },
  homeLinkText: {
    color: ENT.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  }
});
