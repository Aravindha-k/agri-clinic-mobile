import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme";

export type EmptyIllustrationVariant = "farmers" | "visits" | "sync" | "map" | "generic";

type IconName = ComponentProps<typeof Ionicons>["name"];

const VARIANTS: Record<
  EmptyIllustrationVariant,
  { primary: IconName; secondary: IconName; accent: IconName }
> = {
  farmers: { primary: "people", secondary: "leaf", accent: "location" },
  visits: { primary: "clipboard", secondary: "checkmark-circle", accent: "time" },
  sync: { primary: "cloud-upload", secondary: "wifi", accent: "refresh" },
  map: { primary: "map", secondary: "navigate", accent: "pin" },
  generic: { primary: "folder-open", secondary: "search", accent: "information-circle" }
};

type Props = {
  variant?: EmptyIllustrationVariant;
};

/** Composed icon “illustration” for empty states (no extra image assets). */
export function EmptyStateIllustration({ variant = "generic" }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const icons = VARIANTS[variant];

  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { borderColor: c.primarySoft, backgroundColor: c.card }]}>
        <View style={[styles.inner, { backgroundColor: c.primarySoft }]}>
          <Ionicons name={icons.primary} size={36} color={c.primaryDark} />
        </View>
        <View style={[styles.badge, styles.badgeA, { backgroundColor: c.card }]}>
          <Ionicons name={icons.secondary} size={18} color={c.primary} />
        </View>
        <View style={[styles.badge, styles.badgeB, { backgroundColor: c.accentSoft }]}>
          <Ionicons name={icons.accent} size={16} color={c.primaryDark} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginBottom: 16 },
  ring: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 112,
    justifyContent: "center",
    width: 112
  },
  inner: {
    alignItems: "center",
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72
  },
  badge: {
    alignItems: "center",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    width: 34
  },
  badgeA: { right: -4, top: 8 },
  badgeB: { bottom: 4, left: -6 }
});
