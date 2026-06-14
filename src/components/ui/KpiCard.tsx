import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  onPress?: () => void;
};

export function KpiCard({ icon, label, value, hint, accent, onPress }: Props) {
  const { colors, type, shadows } = useDesignSystem();

  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accent ? colors.primarySoft : colors.card,
          borderColor: accent ? colors.primary : colors.borderSubtle
        },
        shadows.card
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent ? colors.card : colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[type.metric, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.94 }}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    minHeight: 112,
    padding: 14
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40
  }
});
