import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useNavigation } from "@react-navigation/native";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { AppHeader } from "../components/ui";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useI18n } from "../i18n/I18nContext";
import { scheduleReminderSoundTest } from "../notifications/fieldReminderNotifications";
import { playFieldReminderSound } from "../notifications/playReminderSound";
import { useAppPreferences } from "../storage/AppPreferencesContext";
import { useTheme } from "../theme";
import type { AppLanguage } from "../i18n";

export function SettingsScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const { colors, type, shadows } = useDesignSystem();
  const { isDark, toggleTheme } = useTheme();
  const { autoSyncOnReconnect, wifiOnlySync, trackingBatterySaver, reminderSoundsEnabled, setPreference } =
    useAppPreferences();
  const { t, language, setLanguage } = useI18n();

  async function testReminderSound(kind: "water" | "heat" | "battery") {
    if (reminderSoundsEnabled && (kind === "water" || kind === "heat")) {
      void playFieldReminderSound(kind);
    }

    const result = await scheduleReminderSoundTest(kind, reminderSoundsEnabled, 5);
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title={t("settings.title")} subtitle={t("settings.subtitle")} onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={type.label}>{t("settings.language")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
          <LanguageRow language={language} onSelect={(lang) => void setLanguage(lang)} t={t} />
        </View>

        <Text style={[type.label, styles.sectionGap]}>{t("settings.appearance")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
          <SettingRow
            icon={isDark ? "moon" : "sunny"}
            title={t("settings.darkMode")}
            subtitle={t("settings.darkModeHint")}
            right={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: colors.primary }} />}
          />
        </View>

        <Text style={[type.label, styles.sectionGap]}>{t("settings.sync")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
          <SettingRow
            icon="cloud-upload-outline"
            title={t("settings.autoSync")}
            subtitle={t("settings.autoSyncHint")}
            right={
              <Switch
                value={autoSyncOnReconnect}
                onValueChange={(v) => void setPreference("autoSyncOnReconnect", v)}
                trackColor={{ true: colors.primary }}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <SettingRow
            icon="wifi-outline"
            title={t("settings.wifiOnly")}
            subtitle={t("settings.wifiOnlyHint")}
            right={
              <Switch
                value={wifiOnlySync}
                onValueChange={(v) => void setPreference("wifiOnlySync", v)}
                trackColor={{ true: colors.primary }}
              />
            }
          />
        </View>

        <Text style={[type.label, styles.sectionGap]}>{t("settings.tracking")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
          <SettingRow
            icon="battery-charging-outline"
            title={t("settings.batterySaver")}
            subtitle={t("settings.batterySaverHint")}
            right={
              <Switch
                value={trackingBatterySaver}
                onValueChange={(v) => void setPreference("trackingBatterySaver", v)}
                trackColor={{ true: colors.primary }}
              />
            }
          />
        </View>

        <Text style={[type.label, styles.sectionGap]}>{t("settings.reminders")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
          <SettingRow
            icon="volume-high-outline"
            title={t("settings.reminderSounds")}
            subtitle={t("settings.reminderSoundsHint")}
            right={
              <Switch
                value={reminderSoundsEnabled}
                onValueChange={(v) => void setPreference("reminderSoundsEnabled", v)}
                trackColor={{ true: colors.primary }}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <Text style={[type.caption, styles.testHint]}>{t("settings.reminderTestHint")}</Text>
          <View style={styles.testRow}>
            <ReminderTestButton label={t("settings.reminderTestWater")} onPress={() => void testReminderSound("water")} />
            <ReminderTestButton label={t("settings.reminderTestHeat")} onPress={() => void testReminderSound("heat")} />
            <ReminderTestButton
              label={t("settings.reminderTestBattery")}
              onPress={() => void testReminderSound("battery")}
            />
          </View>
        </View>

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
          style={({ pressed }) => [styles.reset, pressed && { opacity: 0.9 }]}
        >
          <Text style={{ color: colors.danger, fontWeight: "800" }}>{t("settings.resetDefaults")}</Text>
        </Pressable>
      </ScrollView>
    </View>
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
  const { colors, type } = useDesignSystem();
  return (
    <View style={styles.langRow}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="language-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={type.bodyStrong}>{t("settings.language")}</Text>
        <Text style={type.caption}>{t("settings.languageHint")}</Text>
      </View>
      <View style={styles.langChips}>
        <Pressable
          onPress={() => onSelect("en")}
          style={[styles.langChip, language === "en" && { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.langChipText, language === "en" && { color: "#fff" }]}>
            {t("profile.english")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSelect("ta")}
          style={[styles.langChip, language === "ta" && { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.langChipText, language === "ta" && { color: "#fff" }]}>
            {t("profile.tamil")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReminderTestButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, type } = useDesignSystem();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.testBtn,
        { backgroundColor: colors.primarySoft, borderColor: colors.borderSubtle },
        pressed && { opacity: 0.9 }
      ]}
    >
      <Text style={[type.caption, styles.testBtnText, { color: colors.primary }]}>{label}</Text>
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
  right: ReactNode;
}) {
  const { colors, type } = useDesignSystem();
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={type.bodyStrong}>{title}</Text>
        <Text style={type.caption}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  body: { gap: 8, padding: 16, paddingBottom: 32 },
  sectionGap: { marginTop: 12 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  row: { alignItems: "center", flexDirection: "row", gap: 12, padding: 14 },
  langRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 14 },
  langChips: { flexDirection: "row", gap: 6 },
  langChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  langChipText: { fontSize: 13, fontWeight: "700" },
  icon: { alignItems: "center", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  rowCopy: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  testHint: { marginHorizontal: 14, marginTop: 4 },
  testRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 14, paddingTop: 10 },
  testBtn: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  testBtnText: { fontWeight: "700" },
  reset: { alignItems: "center", marginTop: 20, padding: 12 }
});
