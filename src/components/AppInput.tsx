import { KeyboardTypeOptions, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { useDesignSystem } from "../hooks/useDesignSystem";

type Props = TextInputProps & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
  required?: boolean;
  error?: string;
  onLayout?: (event: { nativeEvent: { layout: { y: number } } }) => void;
};

export function AppInput({ label, value, onChangeText, keyboardType, required, error, onLayout, ...props }: Props) {
  const { colors, radius, layout, type } = useDesignSystem();
  const hasError = Boolean(error);

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <Text style={[type.label, { color: hasError ? colors.danger : colors.muted }]}>{required ? `${label} *` : label}</Text>
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: hasError ? colors.danger : colors.border,
            borderRadius: radius.input,
            color: colors.text,
            minHeight: layout.inputMinHeight
          },
          props.multiline && styles.multiline,
          hasError && styles.inputError
        ]}
      />
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  errorText: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  input: {
    borderWidth: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  inputError: { borderWidth: 1.5 },
  multiline: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: "top"
  }
});
