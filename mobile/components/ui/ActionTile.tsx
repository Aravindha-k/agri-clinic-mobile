import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Colors, Enterprise, FontSize, FontWeight, Layout, Shadow, Spacing } from "../../lib/theme";
import { useLocaleTypography } from "../../hooks/useLocaleTypography";
import { PressableCard } from "./PressableCard";

export type ActionTileState = "default" | "selected" | "disabled" | "loading" | "success" | "warning";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  state?: ActionTileState;
  accessibilityLabel?: string;
};

export const ActionTile = memo(function ActionTile({
  icon,
  label,
  onPress,
  state = "default",
  accessibilityLabel
}: Props) {
  const typo = useLocaleTypography();
  const disabled = state === "disabled" || state === "loading";
  const selected = state === "selected" || state === "success";
  const warning = state === "warning";

  return (
    <PressableCard
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected, busy: state === "loading" }}
      style={[
        styles.tile,
        selected && styles.tileSelected,
        warning && styles.tileWarning,
        disabled && styles.tileDisabled
      ]}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected, warning && styles.iconWrapWarning]}>
        {state === "loading" ? (
          <ActivityIndicator color={Colors.brand700} />
        ) : (
          <Ionicons
            name={state === "success" ? "checkmark-circle" : icon}
            size={22}
            color={warning ? Colors.amberText : Colors.brand700}
          />
        )}
      </View>
      <Text style={[styles.label, typo.body]} numberOfLines={2}>
        {label}
      </Text>
    </PressableCard>
  );
});

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Enterprise.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 76,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    ...Shadow.card
  },
  tileSelected: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand700
  },
  tileWarning: {
    backgroundColor: Colors.amberBg,
    borderColor: Colors.amber
  },
  tileDisabled: {
    opacity: 0.45
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: 14,
    height: Layout.touchTargetMin,
    justifyContent: "center",
    width: Layout.touchTargetMin
  },
  iconWrapSelected: {
    backgroundColor: Colors.greenBg
  },
  iconWrapWarning: {
    backgroundColor: Colors.amberBg
  },
  label: {
    color: Colors.text1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    textAlign: "center"
  }
});
