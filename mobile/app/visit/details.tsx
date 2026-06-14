import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { useVisitFormStore } from "../../store/visitFormStore";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  onBack: () => void;
};

export default function VisitDetailsStep({ onBack }: Props) {
  const farmer = useVisitFormStore((s) => s.farmer);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const setStep = useVisitFormStore((s) => s.setStep);

  const label = farmer?.name || newFarmer?.name || "Farmer";

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={18} color={Colors.text1} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>New visit</Text>
          <Text style={styles.headerSub}>Step 2 of 3 — Visit details</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.stepWrap}>
        <StepIndicator step={2} />
      </View>

      <View style={styles.body}>
        <Text style={styles.placeholderTitle}>Visit details</Text>
        <Text style={styles.placeholderSub}>
          Farmer selected: {label}. Step 2 UI will be built next.
        </Text>
        <Pressable onPress={() => setStep(3)} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>Continue to summary →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingBottom: 10,
    paddingHorizontal: Spacing.screen,
    paddingTop: 8
  },
  iconBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  headerCopy: {
    flex: 1,
    gap: 2
  },
  headerTitle: {
    color: Colors.text1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold
  },
  headerSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  stepWrap: {
    paddingBottom: 12,
    paddingHorizontal: Spacing.screen
  },
  body: {
    flex: 1,
    gap: 12,
    paddingHorizontal: Spacing.screen
  },
  placeholderTitle: {
    color: Colors.text1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold
  },
  placeholderSub: {
    color: Colors.text3,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  nextBtn: {
    alignSelf: "flex-start",
    backgroundColor: Colors.brand700,
    borderRadius: Radius.lg,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  nextBtnText: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  }
});
