import { StyleSheet, Text, ViewStyle } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { ClinicCard } from "../brand/ClinicCard";

type Props = {
  label: string;
  value: string | number;
  style?: ViewStyle;
};

export function StatWidget({ label, value, style }: Props) {
  const { colors, type } = useDesignSystem();

  return (
    <ClinicCard compact accent style={StyleSheet.flatten([styles.card, style])}>
      <Text style={[type.metric, { color: colors.text, fontSize: 28 }]}>{value}</Text>
      <Text style={[type.caption, { color: colors.muted, marginTop: 4 }]}>{label}</Text>
    </ClinicCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    justifyContent: "center",
    minHeight: 76
  }
});
