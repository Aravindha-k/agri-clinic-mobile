import { Ionicons } from "@expo/vector-icons";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GhostButton } from "../../mobile/components/ui";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useI18n } from "../i18n/I18nContext";
import { BRAND } from "../brand/constants";
import { FlatCard, ScreenCanvas, StackScreenHeader } from "../../mobile/components/layout";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../../mobile/lib/theme";
import { useStackBottomInset } from "../hooks/useStackBottomInset";

export function HelpScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const stackBottom = useStackBottomInset();
  const { t } = useI18n();

  const tips = [
    { icon: "play-circle-outline" as const, title: t("help.tipWorkday"), body: t("help.tipWorkdayBody") },
    { icon: "add-circle-outline" as const, title: t("help.tipVisit"), body: t("help.tipVisitBody") },
    { icon: "cloud-offline-outline" as const, title: t("help.tipOffline"), body: t("help.tipOfflineBody") },
    { icon: "navigate-outline" as const, title: t("help.tipGps"), body: t("help.tipGpsBody") }
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <StackScreenHeader
        title={t("help.title")}
        subtitle={t("help.subtitle")}
        onBack={() => navigation.goBack()}
        includeSafeTop={false}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.body, { paddingBottom: stackBottom }]}>
        <FlatCard style={styles.hero}>
          <Text style={styles.heroTitle}>{BRAND.appName}</Text>
          <Text style={styles.heroSub}>{BRAND.tagline}</Text>
        </FlatCard>
        {tips.map((tip, index) => (
          <FlatCard key={tip.title} style={styles.tip}>
            <View style={styles.tipIcon}>
              <Ionicons name={tip.icon} size={22} color={Colors.brand700} />
            </View>
            <View style={styles.tipCopy}>
              <Text style={styles.tipTitle}>
                {index + 1}. {tip.title}
              </Text>
              <Text style={styles.tipBody}>{tip.body}</Text>
            </View>
          </FlatCard>
        ))}
        <GhostButton
          label={t("help.contactSupport")}
          onPress={() => void Linking.openURL("mailto:support@agriclinic.local")}
          style={styles.supportBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scrollView: { flex: 1 },
  body: { gap: Spacing.sm, padding: Spacing.screen },
  hero: {
    gap: Spacing.xs,
    padding: Spacing.cardLg
  },
  heroTitle: {
    color: Colors.brand700,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold
  },
  heroSub: {
    color: Colors.text3,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  tip: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.cardLg
  },
  tipIcon: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.inner,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  tipCopy: {
    flex: 1,
    gap: Spacing.xs
  },
  tipTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  tipBody: {
    color: Colors.text3,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  supportBtn: {
    marginTop: Spacing.sm
  }
});
