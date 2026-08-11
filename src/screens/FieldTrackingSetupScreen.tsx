import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CompanyLogo } from "../components/brand/CompanyLogo";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useStackBottomInset } from "../hooks/useStackBottomInset";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../mobile/lib/theme";
import { FONTS } from "../theme/fonts";
import {
  buildChecklist,
  finalizeSetupIfReady,
  openSettingsForMissing,
  probeFieldTrackingPermissions,
  runForegroundLocationStep,
  type FieldTrackingProbe,
  type SetupStepState
} from "../features/fieldTrackingSetup";
import {
  PERMANENTLY_DENIED_MESSAGE,
  SERVICES_OFF_MESSAGE
} from "../features/fieldTrackingSetup/ensureForegroundLocation";

/**
 * LEGACY — not registered in RootNavigator or route types.
 * Normal login / Start Work Day / visit flow must never navigate here.
 * Kept only so an exceptional recovery screen can be remounted if a future
 * Android restriction blocks the in-app runtime request entirely.
 */
export function FieldTrackingSetupScreen() {
  useSecureScreen();
  const navigation = useNavigation();
  const stackBottom = useStackBottomInset();

  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [permanentlyDenied, setPermanentlyDenied] = useState(false);
  const [servicesDisabled, setServicesDisabled] = useState(false);
  const [probe, setProbe] = useState<FieldTrackingProbe | null>(null);
  const [checklist, setChecklist] = useState<SetupStepState[]>([]);
  const [done, setDone] = useState(false);

  const refresh = useCallback(async () => {
    const next = await probeFieldTrackingPermissions();
    setProbe(next);
    setChecklist(buildChecklist(next));
    if (next.foregroundGranted && next.preciseOk) {
      setPermanentlyDenied(false);
    }
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void (async () => {
          const next = await refresh();
          if (next.foregroundGranted && next.preciseOk) {
            setPermanentlyDenied(false);
            setServicesDisabled(false);
            setHint(null);
          }
        })();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  const onEnableLocation = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setHint(null);
    try {
      const result = await runForegroundLocationStep();
      const next = await refresh();
      if (!result.ok) {
        const blocked = Boolean(result.permanentlyDenied);
        const gpsOff = Boolean(result.servicesDisabled);
        setPermanentlyDenied(blocked);
        setServicesDisabled(gpsOff);
        // Never show Settings copy for a normal denial (canAskAgain true).
        if (blocked) {
          setHint(PERMANENTLY_DENIED_MESSAGE);
        } else if (gpsOff) {
          setHint(SERVICES_OFF_MESSAGE);
        } else {
          setHint(result.message ?? "Tap Enable Location to allow access.");
        }
        return;
      }
      setPermanentlyDenied(false);
      setServicesDisabled(false);
      const finalized = await finalizeSetupIfReady();
      if (finalized || (next.foregroundGranted && next.preciseOk)) {
        setDone(true);
        setHint(null);
        return;
      }
      setHint("Location is almost ready. Tap Enable Location again if Precise is still off.");
    } finally {
      setBusy(false);
    }
  }, [busy, refresh]);

  const onDone = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const ready = Boolean(probe?.foregroundGranted && probe?.preciseOk) || done;
  const primaryLabel = servicesDisabled && !permanentlyDenied ? "Turn On Location" : "Enable Location";

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: stackBottom + Spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <CompanyLogo size={72} />
        <Text style={styles.title}>Enable Location</Text>
        <Text style={styles.body}>
          {ready
            ? "Location is ready. You can start your workday when you are in the field."
            : "Kavya Field uses your location while you are working to record field visits and your workday."}
        </Text>

        <View style={styles.list}>
          {checklist.map((step) => (
            <View key={step.id} style={styles.row}>
              <Ionicons
                name={
                  step.status === "done"
                    ? "checkmark-circle"
                    : step.status === "needs_attention"
                      ? "alert-circle"
                      : "ellipse-outline"
                }
                size={22}
                color={
                  step.status === "done"
                    ? Colors.green
                    : step.status === "needs_attention"
                      ? Colors.amber
                      : Colors.text3
                }
              />
              <Text style={styles.rowLabel}>{step.label}</Text>
            </View>
          ))}
        </View>

        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        {ready ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDone}
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void onEnableLocation()}
            style={({ pressed }) => [styles.primary, (pressed || busy) && { opacity: 0.9 }]}
          >
            {busy ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            )}
          </Pressable>
        )}

        {!ready && !permanentlyDenied ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void onEnableLocation()}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Try Again</Text>
          </Pressable>
        ) : null}

        {permanentlyDenied ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              void openSettingsForMissing("foreground").then(() =>
                setHint("Return here after enabling location in app settings.")
              )
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

export type FieldTrackingSetupParams = {
  focusMissing?: Array<"foreground" | "background" | "precise" | "notifications" | "battery">;
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  content: {
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl
  },
  title: {
    color: Colors.text1,
    fontFamily: FONTS.bold,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    textAlign: "center"
  },
  body: {
    color: Colors.text2,
    fontFamily: FONTS.regular,
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: "center"
  },
  list: {
    alignSelf: "stretch",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    padding: Spacing.md
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
    color: Colors.amber,
    fontFamily: FONTS.regular,
    fontSize: FontSize.sm,
    textAlign: "center"
  },
  primary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: Colors.brand700,
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md
  },
  primaryText: {
    color: Colors.onPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  secondary: {
    alignItems: "center",
    alignSelf: "stretch",
    minHeight: 44,
    paddingVertical: Spacing.sm
  },
  secondaryText: {
    color: Colors.brand700,
    fontFamily: FONTS.semibold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  skip: {
    alignItems: "center",
    minHeight: 44,
    paddingVertical: Spacing.sm
  },
  skipText: {
    color: Colors.text3,
    fontFamily: FONTS.regular,
    fontSize: FontSize.sm
  }
});
