import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PremiumIntroBackground } from "./PremiumIntroBackground";
import { AUTH_THEME } from "../../theme/authTheme";

type Props = {
  children: ReactNode;
  variant?: "brand" | "story";
  footer?: ReactNode;
  contentStyle?: ViewStyle;
};

/** Shared full-screen auth shell — splash, bootstrap, login. */
export function AuthScreenLayout({ children, variant = "brand", footer, contentStyle }: Props) {
  return (
    <View style={styles.root}>
      <PremiumIntroBackground variant={variant} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: AUTH_THEME.bg,
    flex: 1
  },
  safe: {
    flex: 1
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  footer: {
    paddingBottom: 8,
    paddingHorizontal: 24
  }
});
