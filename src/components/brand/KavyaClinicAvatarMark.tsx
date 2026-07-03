import { Ionicons } from "@expo/vector-icons";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { BRAND, BRAND_COLORS, LOGO_IMAGE } from "../../config/brand";

type Props = {
  size: number;
};

/**
 * Default employee profile "face" — Kavya Agri Clinic logo mark on a clean circular surface.
 * Shown when admin has not uploaded a profile photo.
 */
export function KavyaClinicAvatarMark({ size }: Props) {
  const showWordmark = size >= 80;
  const logoSize = Math.round(size * (showWordmark ? 0.52 : 0.64));
  const labelSize = Math.max(8, Math.round(size * 0.095));
  const subSize = Math.max(6, Math.round(size * 0.065));

  if (!LOGO_IMAGE) {
    return <MonogramFace size={size} />;
  }

  return (
    <View
      accessibilityLabel="Kavya Agri Clinic"
      style={[styles.shell, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Image
        source={LOGO_IMAGE}
        style={{ width: logoSize, height: logoSize }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {showWordmark ? (
        <View style={styles.wordmark}>
          <Text style={[styles.brandShort, { fontSize: labelSize }]} numberOfLines={1}>
            {(BRAND as { brandShortName?: string }).brandShortName ?? "KAVYA"}
          </Text>
          <Text style={[styles.brandSub, { fontSize: subSize }]} numberOfLines={1}>
            AGRI CLINIC
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function MonogramFace({ size }: { size: number }) {
  const letter = Math.round(size * 0.38);
  return (
    <View
      style={[
        styles.monogramShell,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: BRAND_COLORS.primary }
      ]}
    >
      <Ionicons name="leaf" size={Math.round(size * 0.18)} color="rgba(255,255,255,0.85)" style={styles.leaf} />
      <Text style={[styles.monogram, { fontSize: letter }]}>K</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15, 107, 67, 0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#0A3D28",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4
      },
      default: { elevation: 1 }
    })
  },
  wordmark: {
    alignItems: "center",
    gap: 1,
    marginTop: 2
  },
  brandShort: {
    color: BRAND_COLORS.primary,
    fontWeight: "800",
    letterSpacing: 0.6,
    textAlign: "center"
  },
  brandSub: {
    color: "#5C6B63",
    fontWeight: "600",
    letterSpacing: 0.35,
    textAlign: "center"
  },
  monogramShell: {
    alignItems: "center",
    justifyContent: "center"
  },
  monogram: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  leaf: {
    position: "absolute",
    right: "18%",
    top: "16%"
  }
});
