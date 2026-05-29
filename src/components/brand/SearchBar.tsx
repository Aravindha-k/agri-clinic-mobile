import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChangeText, placeholder = "Search…" }: Props) {
  const { colors, radius, layout } = useDesignSystem();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderSubtle ?? colors.border,
          borderRadius: radius.md,
          minHeight: layout.inputMinHeight
        }
      ]}
    >
      <Ionicons name="search" size={layout.iconSizeMd} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text }]}
        returnKeyType="search"
      />
      {value.length ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Ionicons name="close-circle" size={layout.iconSizeMd} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12
  },
  input: { flex: 1, fontSize: 15, fontWeight: "600", paddingVertical: 0 }
});
