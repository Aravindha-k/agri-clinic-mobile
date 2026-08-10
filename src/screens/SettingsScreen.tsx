import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useI18n } from "../i18n/I18nContext";
import { scheduleReminderSoundTest } from "../notifications/fieldReminderNotifications";
import { playFieldReminderSound } from "../notifications/playReminderSound";
import { useAppPreferences } from "../storage/AppPreferencesContext";
import {
  clearBiometricLogin,
  enableBiometricLoginWithVerification,
  getBiometricLoginStatus,
  type BiometricLoginStatus
} from "../storage/biometricLoginStorage";
import { getFieldTrackingHealth, enableLocationForFieldWork, openSettingsForMissing } from "../features/fieldTrackingSetup";
import type { AppLanguage } from "../i18n";
import { FlatCard, ScreenCanvas, StackScreenHeader } from "../../mobile/components/layout";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../../mobile/lib/theme";
import { useStackBottomInset } from "../hooks/useStackBottomInset";

export function SettingsScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const stackBottom = useStackBottomInset();
  const { autoSyncOnReconnect, wifiOnlySync, trackingBatterySaver, reminderSoundsEnabled, setPreference } =
    useAppPreferences();
  const { t, language, setLanguage } = useI18n();
  const [biometricStatus, setBiometricStatus] = useState<BiometricLoginStatus | null>(null);
  const [trackingReady, setTrackingReady] = useState<boolean | null>(null);

  const refreshBiometricStatus = useCallback(async () => {
    setBiometricStatus(await getBiometricLoginStatus());
  }, []);

  const refreshTrackingSetup = useCallback(async () => {
    try {
      const health = await getFieldTrackingHealth();
      setTrackingReady(health.ready);
    } catch {
      setTrackingReady(null);
    }
  }, []);

  useEffect(() => {
    void refreshBiometricStatus();
  }, [refreshBiometricStatus]);

  useFocusEffect(
    useCallback(() => {
      void refreshTrackingSetup();
    }, [refreshTrackingSetup])
  );

  async function testReminderSound() {
    if (reminderSoundsEnabled) {
      void playFieldReminderSound();
    }

    const result = await scheduleReminderSoundTest(reminderSoundsEnabled, 5);
    if (result === "web") {
      Alert.alert(t("settings.reminderTestTitle"), t("settings.reminderTestWeb"));
      return;
    }
    if (result === "denied") {
      Alert.alert(t("settings.reminderTestTitle"), t("settings.reminderTestDenied"));
      return;
    }
    Alert.alert(t("settings.reminderTestTitle"), t("settings.reminderTestScheduled"));
  }

  async function toggleFingerprintLogin() {
    if (!biometricStatus) return;
    if (!biometricStatus.hardwareAvailable) return;
    if (!biometricStatus.enrolled) return;

    if (biometricStatus.enabled) {
      await clearBiometricLogin();
      Alert.alert(t("settings.fingerprintLogin"), t("settings.fingerprintDisabled"));
      await refreshBiometricStatus();
      return;
    }

    const enabled = await enableBiometricLoginWithVerification();
    if (enabled) {
      Alert.alert(t("settings.fingerprintLogin"), t("settings.fingerprintEnabled"));
    } else {
      Alert.alert(t("settings.fingerprintLogin"), t("settings.fingerprintEnableFailed"));
    }
    await refreshBiometricStatus();
  }

  function openDeviceSecuritySettings() {
    void Linking.openSettings();
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <StackScreenHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        onBack={() => navigation.goBack()}
        includeSafeTop={false}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.body, { paddingBottom: stackBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>{t("settings.language")}</Text>
        <FlatCard padded={false}>
          <LanguageRow language={language} onSelect={(lang) => void setLanguage(lang)} t={t} />
        </FlatCard>
        <Text style={styles.languageHintCaption}>{t("settings.languageSwitchApplies")}</Text>

        <Text style={styles.sectionLabel}>{t("settings.appearance")}</Text>
        <FlatCard padded={false}>
          <SettingRow
            icon="contrast-outline"
            title={t("settings.lightThemeOnly")}
            subtitle={t("settings.lightThemeOnlyHint")}
          />
        </FlatCard>

        <Text style={styles.sectionLabel}>{t("settings.sync")}</Text>
        <FlatCard padded={false}>
          <SettingRow
            icon="cloud-upload-outline"
            title={t("settings.autoSync")}
            subtitle={t("settings.autoSyncHint")}
            right={
              <Switch
                value={autoSyncOnReconnect}
                onValueChange={(v) => void setPreference("autoSyncOnReconnect", v)}
                trackColor={{ true: Colors.brand700 }}
                accessibilityLabel={t("settings.autoSync")}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="wifi-outline"
            title={t("settings.wifiOnly")}
            subtitle={t("settings.wifiOnlyHint")}
            right={
              <Switch
                value={wifiOnlySync}
                onValueChange={(v) => void setPreference("wifiOnlySync", v)}
                trackColor={{ true: Colors.brand700 }}
                accessibilityLabel={t("settings.wifiOnly")}
              />
            }
          />
        </FlatCard>

        <Text style={styles.sectionLabel}>{t("settings.security")}</Text>
        <FlatCard padded={false}>
          {!biometricStatus?.hardwareAvailable ? (
            <SettingRow
              icon="finger-print-outline"
              title={t("settings.fingerprintLogin")}
              subtitle={t("settings.fingerprintNotSupported")}
            />
          ) : !biometricStatus.enrolled ? (
            <>
              <SettingRow
                icon="finger-print-outline"
                title={t("settings.fingerprintLogin")}
                subtitle={t("settings.fingerprintNotEnrolled")}
              />
              <View style={styles.divider} />
              <Pressable
                onPress={openDeviceSecuritySettings}
                accessibilityRole="button"
                accessibilityLabel={t("settings.fingerprintOpenSettings")}
                style={({ pressed }) => [styles.reset, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.resetText}>{t("settings.fingerprintOpenSettings")}</Text>
              </Pressable>
            </>
          ) : (
            <SettingRow
              icon="finger-print-outline"
              title={t("settings.fingerprintLogin")}
              subtitle={biometricStatus.enabled ? t("settings.fingerprintOn") : t("settings.fingerprintOff")}
              right={
                <Switch
                  value={biometricStatus.enabled}
                  onValueChange={() => void toggleFingerprintLogin()}
                  trackColor={{ true: Colors.brand700 }}
                  accessibilityLabel={t("settings.fingerprintLogin")}
                />
              }
            />
          )}
        </FlatCard>

        <Text style={styles.sectionLabel}>{t("settings.tracking")}</Text>
        <FlatCard padded={false}>
          <Pressable
            onPress={() => {
              void (async () => {
                const result = await enableLocationForFieldWork();
                await refreshTrackingSetup();
                if (result.ok) {
                  Alert.alert(t("settings.fieldTrackingSetup"), t("settings.fieldTrackingReady"));
                  return;
                }
                if (result.permanentlyDenied) {
                  Alert.alert(
                    t("settings.fieldTrackingSetup"),
                    "Location permission is disabled for Kavya Agri Clinic.",
                    [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("settings.fingerprintOpenSettings"),
                        onPress: () => {
                          void openSettingsForMissing("foreground");
                        }
                      }
                    ]
                  );
                  return;
                }
                if (result.servicesDisabled) {
                  Alert.alert(t("settings.fieldTrackingSetup"), result.message || "Turn on phone location.");
                }
              })();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("settings.fieldTrackingSetup")}
            style={({ pressed }) => [pressed && { opacity: 0.92 }]}
          >
            <SettingRow
              icon="navigate-circle-outline"
              title={t("settings.fieldTrackingSetup")}
              subtitle={
                trackingReady == null
                  ? t("settings.fieldTrackingChecking")
                  : trackingReady
                    ? t("settings.fieldTrackingReady")
                    : t("settings.fieldTrackingNeedsAttention")
              }
              right={
                <Ionicons name="chevron-forward" size={18} color={Colors.text3} />
              }
            />
          </Pressable>
          <View style={styles.divider} />
          <SettingRow
            icon="battery-charging-outline"
            title={t("settings.batterySaver")}
            subtitle={t("settings.batterySaverHint")}
            right={
              <Switch
                value={trackingBatterySaver}
                onValueChange={(v) => void setPreference("trackingBatterySaver", v)}
                trackColor={{ true: Colors.brand700 }}
                accessibilityLabel={t("settings.batterySaver")}
              />
            }
          />
        </FlatCard>

        <Text style={styles.sectionLabel}>{t("settings.reminders")}</Text>
        <FlatCard padded={false}>
          <SettingRow
            icon="volume-high-outline"
            title={t("settings.reminderSounds")}
            subtitle={t("settings.reminderSoundsHint")}
            right={
              <Switch
                value={reminderSoundsEnabled}
                onValueChange={(v) => void setPreference("reminderSoundsEnabled", v)}
                trackColor={{ true: Colors.brand700 }}
                accessibilityLabel={t("settings.reminderSounds")}
              />
            }
          />
          <View style={styles.divider} />
          <Text style={styles.testHint}>{t("settings.reminderTestHint")}</Text>
          <View style={styles.testRow}>
            <ReminderTestButton label={t("settings.reminderTestWater")} onPress={() => void testReminderSound()} />
          </View>
        </FlatCard>

        <Pressable
          onPress={() =>
            Alert.alert(t("settings.resetTitle"), t("settings.resetBody"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("settings.reset"),
                style: "destructive",
                onPress: () => {
                  void setPreference("autoSyncOnReconnect", true);
                  void setPreference("wifiOnlySync", false);
                  void setPreference("trackingBatterySaver", false);
                  void setPreference("reminderSoundsEnabled", true);
                }
              }
            ])
          }
          accessibilityRole="button"
          accessibilityLabel={t("settings.resetDefaults")}
          style={({ pressed }) => [styles.reset, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.resetText}>{t("settings.resetDefaults")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function LanguageRow({
  language,
  onSelect,
  t
}: {
  language: AppLanguage;
  onSelect: (lang: AppLanguage) => void;
  t: (key: string) => string;
}) {
  return (
    <View style={styles.langRow}>
      <View style={styles.icon}>
        <Ionicons name="language-outline" size={20} color={Colors.brand700} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{t("settings.language")}</Text>
        <Text style={styles.rowSub}>{t("settings.languageHint")}</Text>
      </View>
      <View style={styles.langChips}>
        <Pressable
          onPress={() => onSelect("en")}
          accessibilityRole="radio"
          accessibilityLabel={t("profile.english")}
          accessibilityState={{ checked: language === "en" }}
          style={[styles.langChip, language === "en" && styles.langChipActive]}
        >
          <Text style={[styles.langChipText, language === "en" && styles.langChipTextActive]}>
            {t("profile.english")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSelect("ta")}
          accessibilityRole="radio"
          accessibilityLabel={t("profile.tamil")}
          accessibilityState={{ checked: language === "ta" }}
          style={[styles.langChip, language === "ta" && styles.langChipActive]}
        >
          <Text style={[styles.langChipText, language === "ta" && styles.langChipTextActive]}>
            {t("profile.tamil")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReminderTestButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.testBtn, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.testBtnText}>{label}</Text>
    </Pressable>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  right
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={20} color={Colors.brand700} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scrollView: { flex: 1 },
  body: { gap: Spacing.sm, padding: Spacing.screen },
  sectionLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    textTransform: "uppercase"
  },
  languageHintCaption: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 56,
    padding: Spacing.cardLg
  },
  langRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    padding: Spacing.cardLg
  },
  langChips: { flexDirection: "row", gap: Spacing.sm },
  langChip: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm
  },
  langChipActive: {
    backgroundColor: Colors.brand700,
    borderColor: Colors.brand700
  },
  langChipText: {
    color: Colors.text2,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  langChipTextActive: {
    color: Colors.surface
  },
  icon: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.inner,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  rowSub: {
    color: Colors.text3,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  divider: {
    backgroundColor: Colors.border,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.cardLg
  },
  testHint: {
    color: Colors.text3,
    fontSize: FontSize.md,
    marginHorizontal: Spacing.cardLg,
    marginTop: Spacing.xs
  },
  testRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    padding: Spacing.cardLg,
    paddingTop: Spacing.sm
  },
  testBtn: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.border,
    borderRadius: Radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm
  },
  testBtnText: {
    color: Colors.brand700,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  reset: { alignItems: "center", marginTop: Spacing.lg, minHeight: 48, padding: Spacing.md },
  resetText: { color: Colors.red, fontSize: FontSize.md, fontWeight: FontWeight.bold }
});
