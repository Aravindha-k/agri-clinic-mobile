import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Option<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
};

export function FilterChips<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, radius } = useDesignSystem();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((opt) => {
        const on = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: on ? colors.primary : colors.card,
                borderColor: on ? colors.primary : colors.borderSubtle ?? colors.border,
                opacity: pressed ? 0.9 : 1
              }
            ]}
          >
            <Text style={{ color: on ? "#FFFFFF" : colors.textSecondary, fontWeight: "800", fontSize: 12 }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 8 }
});
