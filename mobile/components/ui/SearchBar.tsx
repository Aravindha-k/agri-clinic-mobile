import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { Colors, Enterprise, FontSize, Layout, Radius, Spacing } from "../../lib/theme";

type Props = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SearchBar({ placeholder, value, onChangeText, onClear, style }: Props) {
  function handleClear() {
    onChangeText("");
    onClear?.();
  }

  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={20} color={Colors.text4} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text4}
        style={styles.input}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable onPress={handleClear} hitSlop={8} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={20} color={Colors.text4} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    height: Layout.buttonHeight - 4,
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: Spacing.lg
  },
  input: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.body,
    paddingVertical: 0
  }
});
