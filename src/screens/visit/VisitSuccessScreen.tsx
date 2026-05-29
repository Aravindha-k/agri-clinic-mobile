import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, AppLogo, PremiumCard, PrimaryButton, SecondaryButton } from "../../components/ui";
import { VisitFlowParamList } from "../../navigation/types";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<VisitFlowParamList, "VisitSuccess">;

export function VisitSuccessScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { visitId, queued, evidenceWarning } = route.params;

  function goHome() {
    navigation.getParent()?.goBack();
  }

  function startAnother() {
    navigation.reset({
      index: 0,
      routes: [{ name: "NewVisitFarmer", params: { fresh: true } }]
    });
  }

  const subtitle = queued
    ? "Your visit and evidence will upload when you are back online."
    : evidenceWarning
      ? evidenceWarning
      : "Visit and evidence submitted successfully.";

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader title="Visit saved" subtitle={queued ? "Queued for sync" : "Submitted successfully"} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.illustration, { backgroundColor: c.primarySoft }]}>
          <Ionicons name="leaf" size={28} color={c.primary} style={styles.leafL} />
          <Ionicons name="nutrition" size={22} color={c.primaryLight} style={styles.leafR} />
        </View>
        <PremiumCard elevated style={styles.card}>
          <View style={styles.logoStack}>
            <AppLogo size="md" />
            <View style={[styles.check, { backgroundColor: queued ? c.warningSoft : c.successSoft }]}>
              <Ionicons
                name={queued ? "cloud-upload" : "checkmark-circle"}
                size={28}
                color={queued ? c.warning : c.success}
              />
            </View>
          </View>
          <Text style={[styles.title, { color: c.text }]}>{queued ? "Saved offline" : "Visit submitted"}</Text>
          <Text style={[styles.sub, { color: evidenceWarning ? c.warning : c.muted }]}>{subtitle}</Text>
          {!queued && visitId ? <Text style={[styles.id, { color: c.primary }]}>Visit #{visitId}</Text> : null}
        </PremiumCard>

        <PrimaryButton title="Start another visit" onPress={startAnother} />
        <SecondaryButton title="Back to home" onPress={goHome} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { gap: 14, padding: 16, paddingBottom: 32 },
  illustration: {
    alignItems: "center",
    borderRadius: 22,
    height: 72,
    justifyContent: "center",
    marginBottom: 4,
    overflow: "hidden"
  },
  leafL: { left: "22%", position: "absolute" },
  leafR: { position: "absolute", right: "24%", top: 18 },
  card: { alignItems: "center", paddingVertical: 24 },
  logoStack: { alignItems: "center", justifyContent: "center", marginBottom: 12, minHeight: 80 },
  check: {
    alignItems: "center",
    borderRadius: 22,
    bottom: -2,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: "30%",
    width: 44
  },
  title: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  sub: { fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: "center" },
  id: { fontSize: 14, fontWeight: "800", marginTop: 12 }
});
