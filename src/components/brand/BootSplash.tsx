import { Image, StyleSheet, Text, View } from "react-native";
import { BRAND } from "../../config/brand";

const LOGO = require("../../../assets/brand/logo-splash.png");
const BG = "#142818";

type Props = {
  error?: string | null;
};

/** Ultra-minimal first paint — no providers, fonts, auth, or navigation. */
export function BootSplash({ error }: Props) {
  return (
    <View style={styles.root}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Kavya logo" />
      <Text style={styles.title}>{BRAND.splashTitle}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: BG,
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 9999
  },
  logo: {
    height: 120,
    width: 120
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center"
  },
  error: {
    color: "#FCA5A5",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center"
  }
});
