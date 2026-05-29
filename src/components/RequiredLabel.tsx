import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

type Props = {
  label: string;
  error?: boolean;
};

/** Field section title with red Required marker (visible in light & dark theme). */
export function RequiredLabel({ label, error }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: error ? c.danger : c.muted }]}>{label}</Text>
      <Text style={[styles.required, { color: c.danger }]}>Required</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  required: {
    fontSize: 11,
    fontWeight: "800"
  }
});
