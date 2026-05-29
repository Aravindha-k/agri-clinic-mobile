import { ReactNode } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useTabBarBottomInset } from "../../hooks/useTabBarBottomInset";
import { layout } from "../../theme/designSystem";
import { useTheme } from "../../theme";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  scroll?: boolean;
  gap?: number;
  noPadding?: boolean;
};

/** Consistent screen content area below headers. */
export function ScreenBody({ children, style, scroll, gap = layout.screenGap, noPadding }: Props) {
  const { theme } = useTheme();
  const tabInset = useTabBarBottomInset();
  const contentStyle = [
    styles.body,
    !noPadding && { paddingHorizontal: layout.screenPaddingH },
    { gap, paddingBottom: Math.max(tabInset, layout.screenPaddingBottom) },
    style
  ];

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[{ flex: 1, backgroundColor: theme.colors.background }, contentStyle]}>{children}</View>;
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    paddingTop: layout.screenGap
  }
});
