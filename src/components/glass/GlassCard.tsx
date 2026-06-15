import { BlurView } from "expo-blur";
import { type ReactNode } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { ENT, ENT_CARD_SHADOW } from "../../theme/enterprise";
import { GE } from "../../theme/glassEmerald";

type Variant = "surface" | "glass";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  /** surface = white card (app screens); glass = translucent (auth only) */
  variant?: Variant;
};

export default function GlassCard({ children, style, variant = "surface" }: Props) {
  const isGlass = variant === "glass";

  return (
    <View
      style={[
        styles.card,
        isGlass ? styles.glassCard : styles.surfaceCard,
        !isGlass && ENT_CARD_SHADOW,
        style
      ]}
    >
      {isGlass && Platform.OS !== "web" ? (
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
      ) : null}
      {isGlass ? (
        <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden"
  },
  surfaceCard: {
    backgroundColor: ENT.card,
    borderColor: ENT.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  glassCard: {
    borderColor: GE.glassBorder,
    borderWidth: StyleSheet.hairlineWidth
  },
  glassOverlay: {
    backgroundColor: GE.glass
  },
  content: {
    position: "relative",
    zIndex: 1
  }
});
