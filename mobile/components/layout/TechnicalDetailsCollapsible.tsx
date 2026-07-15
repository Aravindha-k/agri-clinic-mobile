import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { FlatCard } from "./FlatCard";

type Props = {
  children: ReactNode;
};

/** Collapses engineer-facing panels behind a simple disclosure. */
export function TechnicalDetailsCollapsible({ children }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={t("common.technicalDetails")}
        accessibilityHint={open ? t("common.collapseSection") : t("common.expandSection")}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="construct-outline" size={16} color={Colors.text3} />
        <Text style={styles.toggleText}>{t("common.technicalDetails")}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={Colors.text3} />
      </Pressable>
      {open ? (
        <FlatCard padded={false} style={styles.panel}>
          {children}
        </FlatCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg
  },
  toggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 48,
    paddingVertical: Spacing.sm
  },
  toggleText: {
    color: Colors.text3,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium
  },
  panel: {
    overflow: "hidden",
    padding: Spacing.md
  }
});
