import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Enterprise, FontSize, FontWeight, Spacing } from "../../lib/theme";
import { useLocaleTypography } from "../../hooks/useLocaleTypography";
import { PressableCard } from "./PressableCard";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export const ActionTile = memo(function ActionTile({ icon, label, onPress }: Props) {
  const typo = useLocaleTypography();

  return (
    <PressableCard onPress={onPress} style={styles.tile}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={Colors.brand700} />
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
    paddingVertical: Spacing.md
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Enterprise.radius.input,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  label: {
    color: Colors.text1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    textAlign: "center"
  }
});
