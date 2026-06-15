import { Ionicons } from "@expo/vector-icons";
import { useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import { GE } from "../../theme/glassEmerald";

type Props = TextInputProps & {
  iconName?: keyof typeof Ionicons.glyphMap;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
};

export default function GlassInput({
  iconName,
  rightIcon,
  style,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false
    }).start();
    onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.20)", "rgba(255,255,255,0.65)"]
  });

  const backgroundColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.18)"]
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        containerStyle,
        {
          borderColor,
          backgroundColor
        }
      ]}
    >
      {iconName ? (
        <Ionicons name={iconName} size={18} color={focused ? GE.white : GE.textMuted} />
      ) : null}
      <TextInput
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={GE.textFaint}
        style={[styles.input, style]}
      />
      {rightIcon}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    height: 50,
    paddingHorizontal: 14
  },
  input: {
    color: GE.textPrimary,
    flex: 1,
    fontSize: 14,
    paddingVertical: 0
  }
});
