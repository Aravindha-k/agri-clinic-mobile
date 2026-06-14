import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  /** Green left accent bar (KPI / highlight cards). */
  accent?: boolean;
  compact?: boolean;
};

/** Premium white card — soft shadow, optional green accent border. */
export function ClinicCard({ children, style, accent = false, compact }: Props) {
  const { colors, radius, layout, shadows } = useDesignSystem();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderColor: accent ? colors.primary : colors.borderSubtle ?? colors.border,
          padding: compact ? layout.cardPaddingCompact : layout.cardPadding
        },
        accent && styles.accentBorder,
        shadows.card,
        style
      ]}
    >
      {accent ? <View style={[styles.accentBar, { backgroundColor: colors.primary }]} /> : null}
      <View style={accent ? styles.accentContent : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  },
  accentBorder: {
    borderLeftWidth: 0
  },
  accentBar: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 4
  },
  accentContent: {
    paddingLeft: 4
  }
});
