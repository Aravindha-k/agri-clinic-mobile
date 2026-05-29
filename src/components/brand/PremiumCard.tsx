import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  tint?: "default" | "soft" | "primary";
  compact?: boolean;
};

export function PremiumCard({ children, style, elevated = true, tint = "default", compact }: Props) {
  const { colors, radius, layout, shadows } = useDesignSystem();
  const bg =
    tint === "soft" ? colors.cardMuted : tint === "primary" ? colors.primarySoft : colors.surface ?? colors.card;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          borderColor: colors.borderSubtle ?? colors.border,
          padding: compact ? layout.cardPaddingCompact : layout.cardPadding
        },
        elevated && shadows.card,
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth
  }
});
