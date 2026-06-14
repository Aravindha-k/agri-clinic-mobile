import { Ionicons } from "@expo/vector-icons";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader, PrimaryButton } from "../components/ui";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useI18n } from "../i18n/I18nContext";
import { BRAND } from "../brand/constants";

export function HelpScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const { colors, type, shadows } = useDesignSystem();
  const { t } = useI18n();

  const tips = [
    { icon: "play-circle-outline" as const, title: t("help.tipWorkday"), body: t("help.tipWorkdayBody") },
    { icon: "add-circle-outline" as const, title: t("help.tipVisit"), body: t("help.tipVisitBody") },
    { icon: "cloud-offline-outline" as const, title: t("help.tipOffline"), body: t("help.tipOfflineBody") },
    { icon: "navigate-outline" as const, title: t("help.tipGps"), body: t("help.tipGpsBody") }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title={t("help.title")} subtitle={t("help.subtitle")} onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.body}>
        <View style={[styles.hero, { backgroundColor: colors.primarySoft }, shadows.card]}>
          <Text style={[type.sectionTitle, { color: colors.primaryDark }]}>{BRAND.appName}</Text>
          <Text style={[type.meta, { color: colors.textSecondary, marginTop: 6 }]}>{BRAND.tagline}</Text>
        </View>
        {tips.map((tip) => (
          <View
            key={tip.title}
            style={[styles.tip, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}
          >
            <Ionicons name={tip.icon} size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={type.bodyStrong}>{tip.title}</Text>
              <Text style={[type.meta, { marginTop: 4 }]}>{tip.body}</Text>
            </View>
          </View>
        ))}
        <PrimaryButton
          title={t("help.contactSupport")}
          variant="secondary"
          onPress={() => void Linking.openURL("mailto:support@agriclinic.local")}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  body: { gap: 12, padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 16, padding: 18 },
  tip: {
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    padding: 14
  }
});
