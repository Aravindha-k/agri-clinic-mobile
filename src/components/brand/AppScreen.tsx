import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { useTheme } from "../../theme";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  edges?: boolean;
};

export function AppScreen({ children, scroll = true, keyboard = false, style, contentStyle, edges = false }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsetsCompat();
  const pad = edges ? { paddingBottom: Math.max(insets.bottom, 16) } : undefined;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scroll, pad, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, pad, contentStyle]}>{children}</View>
  );

  const shell = (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }, style]}>
      {body}
    </View>
  );

  if (!keyboard) return shell;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {shell}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { flex: 1 },
  scroll: { flexGrow: 1, gap: 14, padding: 16, paddingBottom: 28 }
});
