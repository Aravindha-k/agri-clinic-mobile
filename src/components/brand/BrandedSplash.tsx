import { StyleSheet, View } from "react-native";
import { BRAND_COLORS } from "../../brand/constants";
import { FadeInView } from "../FadeInView";
import { LoginBackground } from "../login/LoginBackground";
import { BrandedLoader } from "./BrandedLoader";

export function BrandedSplash() {
  return (
    <View style={[styles.screen, { backgroundColor: BRAND_COLORS.splash }]}>
      <LoginBackground />
      <FadeInView offset={12} style={styles.center}>
        <BrandedLoader />
      </FadeInView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" }
});
