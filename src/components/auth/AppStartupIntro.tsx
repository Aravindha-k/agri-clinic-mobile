import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AUTH_THEME } from "../../theme/authTheme";
import { AgriStoryStep } from "./AgriStoryStep";
import { BrandIntroStep } from "./BrandIntroStep";

type Step = "brand" | "story";

type Props = {
  onComplete: () => void;
};

/**
 * Premium cold-start intro (brand → story).
 * Auth bootstrap runs in parallel via AuthProvider; routing happens after onComplete.
 */
export function AppStartupIntro({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("brand");

  return (
    <View style={styles.root}>
      {step === "brand" ? <BrandIntroStep onComplete={() => setStep("story")} /> : null}
      {step === "story" ? <AgriStoryStep onComplete={onComplete} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_THEME.bg,
    zIndex: 50
  }
});
