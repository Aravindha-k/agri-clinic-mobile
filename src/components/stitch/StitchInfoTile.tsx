import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme";
import { stitch } from "../../theme/stitchTokens";

type Props = {
  label: string;
  value: string;
  hint?: string;
  style?: ViewStyle;
};

/** Small tinted stat block (Stitch farm info / KPI tiles). */
export function StitchInfoTile({ label, value, hint, style }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.tile, { backgroundColor: stitch.cardTint, borderColor: c.borderSubtle }, style]}>
      <Text style={[styles.label, { color: c.muted }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.value, { color: c.text }]} numberOfLines={2}>
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: c.primary }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minWidth: 0,
    padding: 12
  },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  value: { fontSize: 16, fontWeight: "800", lineHeight: 22, marginTop: 4 },
  hint: { fontSize: 11, fontWeight: "600", marginTop: 4 }
});
