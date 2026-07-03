import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import { Colors, Enterprise, FontSize, FontWeight, Layout, Radius, Spacing } from "../../lib/theme";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Standard enterprise text field — 52px height, theme tokens only. */
export function EnterpriseTextField({
  label,
  error,
  disabled,
  leftIcon,
  right,
  containerStyle,
  style,
  editable = true,
  placeholderTextColor = Colors.text4,
  ...inputProps
}: Props) {
  const isDisabled = disabled || editable === false;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          error ? styles.fieldError : null,
          isDisabled ? styles.fieldDisabled : null
        ]}
      >
        {leftIcon ? (
          <Ionicons name={leftIcon} size={20} color={Colors.text3} style={styles.leftIcon} />
        ) : null}
        <TextInput
          {...inputProps}
          editable={!isDisabled}
          placeholderTextColor={placeholderTextColor}
          style={[styles.input, style]}
        />
        {right}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    marginBottom: Spacing.md
  },
  label: {
    color: Colors.text1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  },
  field: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: Layout.buttonHeight,
    paddingHorizontal: Spacing.lg
  },
  fieldError: {
    borderColor: Colors.red,
    borderWidth: 1
  },
  fieldDisabled: {
    backgroundColor: Colors.bg,
    opacity: 0.72
  },
  leftIcon: {
    marginRight: Spacing.sm
  },
  input: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.body,
    paddingVertical: Spacing.md
  },
  errorText: {
    color: Colors.redText,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    marginTop: -Spacing.xs
  }
});
