import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { useTheme } from "../../theme";

type Props = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
};

export function LoginField({ label, icon, right, style, onFocus, onBlur, editable = true, ...props }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <View
        pointerEvents="box-none"
        style={[
          styles.field,
          {
            backgroundColor: c.cardMuted,
            borderColor: focused ? c.primary : c.border
          },
          focused && styles.fieldFocused
        ]}
      >
        <Ionicons name={icon} size={20} color={focused ? c.primary : c.muted} style={styles.icon} />
        <TextInput
          {...props}
          editable={editable}
          placeholderTextColor={c.muted}
          style={[styles.input, { color: c.text }, style]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2
  },
  field: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: 14
  },
  fieldFocused: {
    borderWidth: 2
  },
  icon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    minHeight: 48,
    paddingVertical: 12
  },
  right: {
    marginLeft: 4
  }
});
