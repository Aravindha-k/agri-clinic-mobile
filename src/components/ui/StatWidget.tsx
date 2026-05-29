import { StyleSheet, Text, ViewStyle } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { PremiumCard } from "../brand/PremiumCard";

type Props = {
  label: string;
  value: string | number;
  style?: ViewStyle;
};

export function StatWidget({ label, value, style }: Props) {
  const { colors, type } = useDesignSystem();

  return (
    <PremiumCard elevated compact style={StyleSheet.flatten([styles.card, style])}>
      <Text style={[type.metric, { color: colors.primaryDark }]}>{value}</Text>
      <Text style={[type.caption, { marginTop: 2 }]}>{label}</Text>
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    justifyContent: "center",
    minHeight: 76
  }
});
