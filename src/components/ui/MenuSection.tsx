import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

export type MenuSectionItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
};

type Props = {
  title: string;
  items: MenuSectionItem[];
};

export function MenuSection({ title, items }: Props) {
  const { colors, type, shadows } = useDesignSystem();

  return (
    <View style={styles.section}>
      <Text style={[type.label, styles.sectionTitle]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
        {items.map((item, index) => (
          <Pressable
            key={item.title}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.row,
              index > 0 && { borderTopColor: colors.borderSubtle, borderTopWidth: StyleSheet.hairlineWidth },
              pressed && { opacity: 0.94 }
            ]}
          >
            <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.body}>
              <Text style={type.bodyStrong}>{item.title}</Text>
              {item.subtitle ? <Text style={type.caption}>{item.subtitle}</Text> : null}
            </View>
            {item.badge ? (
              <View style={[styles.badge, { backgroundColor: colors.warningSoft }]}>
                <Text style={{ color: colors.warning, fontSize: 12, fontWeight: "800" }}>{item.badge}</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: { marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  row: { alignItems: "center", flexDirection: "row", gap: 12, padding: 14 },
  icon: { alignItems: "center", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  body: { flex: 1, gap: 2 },
  badge: { borderRadius: 999, minWidth: 26, paddingHorizontal: 8, paddingVertical: 4, alignItems: "center" }
});
