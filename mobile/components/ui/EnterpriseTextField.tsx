import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import { Colors, FontSize, FontWeight, IconSize, Layout, Radius, Spacing, minTouchStyle } from "../../lib/theme";

type Props = TextInputProps & {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  rightIconAccessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  multiline?: boolean;
};

/** Standard enterprise text field — 52px height, theme tokens only. */
export function EnterpriseTextField({
  label,
  helperText,
  error,
  required,
  disabled,
  leftIcon,
  right,
  rightIcon,
  onRightIconPress,
  rightIconAccessibilityLabel,
  containerStyle,
  style,
  editable = true,
  placeholderTextColor = Colors.text4,
  multiline,
  ...inputProps
}: Props) {
  const isDisabled = disabled || editable === false;
  const fieldLabel = label ? `${label}${required ? " *" : ""}` : undefined;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {fieldLabel ? <Text style={styles.label}>{fieldLabel}</Text> : null}
      <View
        style={[
          styles.field,
          multiline ? styles.fieldMultiline : null,
          error ? styles.fieldError : null,
          isDisabled ? styles.fieldDisabled : null
        ]}
      >
        {leftIcon ? (
          <Ionicons name={leftIcon} size={IconSize.md} color={Colors.text3} style={styles.leftIcon} />
        ) : null}
        <TextInput
          {...inputProps}
          multiline={multiline}
          editable={!isDisabled}
          placeholderTextColor={placeholderTextColor}
          accessibilityLabel={fieldLabel ?? inputProps.accessibilityLabel}
          style={[styles.input, multiline ? styles.inputMultiline : null, style]}
        />
        {right}
        {rightIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightIconAccessibilityLabel ?? "Field action"}
            onPress={onRightIconPress}
            disabled={!onRightIconPress || isDisabled}
            hitSlop={Layout.iconHitSlop}
            style={minTouchStyle}
          >
            <Ionicons name={rightIcon} size={IconSize.md} color={Colors.text3} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

/** Multiline enterprise textarea — same API as EnterpriseTextField. */
export function EnterpriseTextArea(props: Props) {
  return <EnterpriseTextField {...props} multiline textAlignVertical="top" />;
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
  fieldMultiline: {
    alignItems: "flex-start",
    minHeight: 96,
    paddingVertical: Spacing.md
  },
  fieldError: {
    borderColor: Colors.red,
    borderWidth: 1
  },
  fieldDisabled: {
    backgroundColor: Colors.disabledBg,
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
  inputMultiline: {
    minHeight: 72,
    paddingTop: 0
  },
  errorText: {
    color: Colors.redText,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    marginTop: -Spacing.xs
  },
  helperText: {
    color: Colors.text3,
    fontSize: FontSize.caption,
    marginTop: -Spacing.xs
  }
});
