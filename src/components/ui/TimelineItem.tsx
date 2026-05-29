import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";

type Props = {
  title: string;
  subtitle?: string;
  body?: string;
  isFirst?: boolean;
  isLast?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function TimelineItem({ title, subtitle, body, isFirst, isLast, icon = "ellipse" }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        {!isFirst ? <View style={[styles.line, { backgroundColor: c.timelineLine }]} /> : <View style={styles.lineSpacer} />}
        <View style={[styles.dot, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
          <Ionicons name={icon} size={14} color={c.primaryDark} />
        </View>
        {!isLast ? <View style={[styles.line, styles.lineBottom, { backgroundColor: c.timelineLine }]} /> : <View style={styles.lineSpacer} />}
      </View>
      <View style={[styles.content, { marginBottom: isLast ? 0 : 20 }]}>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text> : null}
        {body ? <Text style={[styles.body, { color: c.textSecondary }]}>{body}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  rail: { alignItems: "center", width: 28 },
  line: { flex: 1, width: 2 },
  lineBottom: { flex: 1 },
  lineSpacer: { flex: 1 },
  dot: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  content: { flex: 1, paddingTop: 2 },
  title: { fontSize: 15, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 6 }
});
