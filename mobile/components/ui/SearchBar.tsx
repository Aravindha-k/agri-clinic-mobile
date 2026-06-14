import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Colors, FontSize, Radius } from "../../lib/theme";

type Props = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
};

export function SearchBar({ placeholder, value, onChangeText, onClear }: Props) {
  function handleClear() {
    onChangeText("");
    onClear?.();
  }

  return (
    <View style={[styles.wrap, { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: Radius.xl }]}>
      <Ionicons name="search" size={18} color={Colors.text4} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text4}
        style={[styles.input, { color: Colors.text1, fontSize: FontSize.md }]}
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
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 48,
    paddingHorizontal: 14
  },
  input: {
    flex: 1,
    paddingVertical: 0
  }
});
