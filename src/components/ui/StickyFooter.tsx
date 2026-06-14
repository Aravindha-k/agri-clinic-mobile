import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  children: ReactNode;
};

export function StickyFooter({ children }: Props) {
  const insets = useSafeAreaInsetsCompat();
  const { colors } = useDesignSystem();

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.borderSubtle,
          paddingBottom: Math.max(insets.bottom, 12)
        }
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12
  }
});
