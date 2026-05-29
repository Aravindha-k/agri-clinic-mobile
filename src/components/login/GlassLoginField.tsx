import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { AUTH_THEME } from "../../theme/authTheme";

type Props = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
};

/** Dark glass input for cinematic login — touch-safe. */
export function GlassLoginField({ icon, right, style, onFocus, onBlur, editable = true, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.field,
        {
          borderColor: focused ? AUTH_THEME.glassFocus : AUTH_THEME.glassBorder,
          backgroundColor: focused ? "rgba(61,255,138,0.08)" : AUTH_THEME.glass
        }
      ]}
    >
      <Ionicons name={icon} size={20} color={focused ? AUTH_THEME.neon : AUTH_THEME.textDim} />
      <TextInput
        {...props}
        editable={editable}
        placeholderTextColor={AUTH_THEME.textDim}
        style={[styles.input, { color: AUTH_THEME.text }, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 16
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    minHeight: 48,
    paddingVertical: 12
  },
  right: {
    marginLeft: 2
  }
});
