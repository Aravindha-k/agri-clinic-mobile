import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { FieldPalette, fieldShadow } from "../../lib/fieldTheme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
};

/** Frosted field glass — lets layered hero decor show through. */
export function FieldGlassSurface({ children, style, borderRadius = 26 }: Props) {
  return (
    <View style={[styles.shell, { borderRadius }, fieldShadow.soft, style]}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={18} tint="light" style={[StyleSheet.absoluteFill, { borderRadius }]} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.tint, { borderRadius }]} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: Platform.OS === "android" ? "rgba(255, 255, 255, 0.42)" : "transparent",
    borderColor: FieldPalette.glassBorder,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative"
  },
  tint: {
    backgroundColor: Platform.OS === "ios" ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.12)"
  },
  content: {
    position: "relative",
    zIndex: 3
  }
});
