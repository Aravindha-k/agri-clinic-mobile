import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CompanyLogo } from "../components/brand/CompanyLogo";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useStackBottomInset } from "../hooks/useStackBottomInset";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../mobile/lib/theme";
import { FONTS } from "../theme/fonts";
import type { RootStackParamList } from "../navigation/types";
import {
  buildChecklist,
  finalizeSetupIfReady,
  getFieldTrackingHealth,
  getOemGuidance,
  openPreciseLocationSettings,
  openSettingsForMissing,
  probeFieldTrackingPermissions,
  runBackgroundLocationStep,
  runBatteryStep,
  runForegroundLocationStep,
  runNotificationStep,
  runOemStep,
  type FieldTrackingProbe,
  type SetupStepId,
  type SetupStepState
} from "../features/fieldTrackingSetup";

type Phase =
  | "intro"
  | "foreground"
  | "background"
  | "precise"
  | "battery"
  | "oem"
  | "notifications"
  | "done";

function statusIcon(status: SetupStepState["status"]) {
  if (status === "done") return "checkmark-circle";
  if (status === "needs_attention") return "alert-circle";
  if (status === "skipped") return "remove-circle-outline";
  return "ellipse-outline";
}

function statusColor(status: SetupStepState["status"]) {
  if (status === "done") return Colors.green;
  if (status === "needs_attention") return Colors.amber;
  return Colors.text3;
}

/**
 * One-time guided “Enable Field Tracking” setup.
 * Opens system settings pages — never silently changes Android settings.
 */
export function FieldTrackingSetupScreen() {
  useSecureScreen();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "FieldTrackingSetup">>();
  const stackBottom = useStackBottomInset();
  const focusMissing = route.params?.focusMissing;

  const [phase, setPhase] = useState<Phase>("intro");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [probe, setProbe] = useState<FieldTrackingProbe | null>(null);
  const [checklist, setChecklist] = useState<SetupStepState[]>([]);

  const refresh = useCallback(async () => {
    const next = await probeFieldTrackingPermissions();
    setProbe(next);
    setChecklist(buildChecklist(next));
    return next;
  }, []);

  useEffect(() => {
    void refresh().then((p) => {
      if (focusMissing?.length) {
        const first = focusMissing[0];
        if (first === "foreground") setPhase("foreground");
        else if (first === "background") setPhase("background");
        else if (first === "precise") setPhase("precise");
        else if (first === "notifications") setPhase("notifications");
        else setPhase("intro");
      } else if (p.expoGoLimited) {
        setHint("Full background tracking needs a development build or field APK.");
      }
    });
  }, [focusMissing, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void (async () => {
          const next = await refresh();
          if (phase === "background" && next.backgroundGranted) {
            setHint("Background location is ready.");
            setPhase("battery");
          }
          if (phase === "precise" && next.preciseOk) {
            setHint("Precise location is on.");
            setPhase(next.expoGoLimited ? "battery" : next.backgroundGranted ? "battery" : "background");
          }
          if (phase === "notifications" && next.notificationsGranted) {
            setHint("Notifications allowed.");
            setPhase("done");
          }
          if (phase === "battery" || phase === "oem") {
            // Guided steps — employee returns after settings.
          }
        })();
      }
    });
    return () => sub.remove();
  }, [phase, refresh]);

  const oem = useMemo(
    () => getOemGuidance(probe?.manufacturerFamily ?? "other"),
    [probe?.manufacturerFamily]
  );

  const finishIfReady = useCallback(async () => {
    const ok = await finalizeSetupIfReady();
    const health = await getFieldTrackingHealth();
    await refresh();
    if (ok || health.ready) {
      setPhase("done");
      setHint(null);
      return true;
    }
    setHint("A few items still need attention. Use Try Again or Fix Now.");
    return false;
  }, [refresh]);

  const onContinue = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setHint(null);
    try {
      if (phase === "intro") {
        setPhase("foreground");
        return;
      }
      if (phase === "foreground") {
        const result = await runForegroundLocationStep();
        await refresh();
        if (!result.ok) {
          setHint(result.message ?? null);
          if (result.message?.includes("Precise")) {
            setPhase("precise");
          }
          return;
        }
        const p = await probeFieldTrackingPermissions();
        if (!p.preciseOk) {
          setPhase("precise");
          return;
        }
        setPhase(p.expoGoLimited ? "battery" : "background");
        return;
      }
      if (phase === "precise") {
        const result = await openPreciseLocationSettings();
        setHint(result.message ?? null);
        return;
      }
      if (phase === "background") {
        const result = await runBackgroundLocationStep();
        await refresh();
        setHint(result.message ?? null);
        if (result.ok) {
          setPhase("battery");
        }
        return;
      }
      if (phase === "battery") {
        const result = await runBatteryStep();
        setHint(result.message ?? null);
        setPhase("oem");
        return;
      }
      if (phase === "oem") {
        const result = await runOemStep();
        setHint(result.message ?? null);
        const p = await refresh();
        setPhase(p.notificationsRequired ? "notifications" : "done");
        if (!p.notificationsRequired) {
          await finishIfReady();
        }
        return;
      }
      if (phase === "notifications") {
        const result = await runNotificationStep();
        await refresh();
        setHint(result.message ?? null);
        if (result.ok) {
          await finishIfReady();
          setPhase("done");
        }
        return;
      }
      if (phase === "done") {
        const ok = await finishIfReady();
        if (ok) {
          navigation.goBack();
        }
      }
    } finally {
      setBusy(false);
    }
  }, [busy, finishIfReady, navigation, phase, refresh]);

  const primaryLabel = useMemo(() => {
    if (busy) return "Please wait…";
    switch (phase) {
      case "intro":
        return "Continue";
      case "foreground":
        return "Allow Location";
      case "precise":
        return "Open Location Settings";
      case "background":
        return probe?.apiLevel != null && probe.apiLevel >= 30
          ? "Open Location Settings"
          : "Allow Background Location";
      case "battery":
        return "Open Battery Settings";
      case "oem":
        return "Open Phone Settings";
      case "notifications":
        return "Allow Notifications";
      case "done":
        return "Done";
      default:
        return "Continue";
    }
  }, [busy, phase, probe?.apiLevel]);

  const title = phase === "intro" || phase === "done" ? "Enable Field Tracking" : "Enable Field Tracking";
  const body = useMemo(() => {
    switch (phase) {
      case "intro":
        return "Kavya Field uses your location to record field visits and workday tracking.";
      case "foreground":
        return "Choose “While using the app” and keep Precise Location on. Do not choose “Only this time” — lasting access is required for workday tracking.";
      case "precise":
        return "Precise location is needed to record the correct field location.";
      case "background":
        return "To record field movement while your phone is locked, select:\nPermissions → Location → Allow all the time.";
      case "battery":
        return "Allow Kavya Field to run in the background so visits are recorded while the screen is locked.";
      case "oem":
        return `${oem.title}\n${oem.bullets.map((b) => `• ${b}`).join("\n")}`;
      case "notifications":
        return "Kavya Field displays a small tracking notification while your workday is active.";
      case "done":
        return "Setup looks ready. You can start your workday when you are in the field.";
      default:
        return "";
    }
  }, [oem.bullets, oem.title, phase]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: stackBottom + Spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <CompanyLogo size={72} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        {probe?.expoGoLimited ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Expo Go cannot fully track in the background. Install a development build or field APK for
              lock-screen tracking.
            </Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {checklist.map((step) => (
            <View key={step.id} style={styles.row}>
              <Ionicons name={statusIcon(step.status)} size={22} color={statusColor(step.status)} />
              <Text style={styles.rowLabel}>{step.label}</Text>
            </View>
          ))}
        </View>

        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void onContinue()}
          style={({ pressed }) => [styles.primary, (pressed || busy) && { opacity: 0.9 }]}
        >
          {busy ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          )}
        </Pressable>

        {phase !== "intro" && phase !== "done" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void refresh().then(() => setHint("Checked again."))}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Try Again</Text>
          </Pressable>
        ) : null}

        {phase === "foreground" || phase === "background" || phase === "precise" || phase === "notifications" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              void openSettingsForMissing(
                phase === "notifications" ? "notifications" : phase === "precise" ? "precise" : phase === "background" ? "background" : "foreground"
              ).then(() => setHint("Return here after changing the setting."))
            }
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Open Settings</Text>
          </Pressable>
        ) : null}

        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.skip}>
          <Text style={styles.skipText}>Not now</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  content: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.md
  },
  title: {
    color: Colors.text1,
    fontFamily: FONTS.bold,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  body: {
    color: Colors.text2,
    fontFamily: FONTS.regular,
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: "center"
  },
  banner: {
    backgroundColor: Colors.amberBg,
    borderColor: Colors.amber,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    width: "100%"
  },
  bannerText: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    lineHeight: 18
  },
  list: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    padding: Spacing.md,
    width: "100%"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm
  },
  rowLabel: {
    color: Colors.text1,
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: FontSize.md
  },
  hint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    lineHeight: 18,
    textAlign: "center"
  },
  primary: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    width: "100%"
  },
  primaryText: {
    color: Colors.onPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  secondary: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    width: "100%"
  },
  secondaryText: {
    color: Colors.text1,
    fontFamily: FONTS.semibold,
    fontSize: FontSize.md
  },
  skip: {
    paddingVertical: Spacing.sm
  },
  skipText: {
    color: Colors.text3,
    fontSize: FontSize.sm
  }
});

export type FieldTrackingSetupParams = {
  focusMissing?: SetupStepId[];
};
