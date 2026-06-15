import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FloatCard from "../cinematic/FloatCard";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Action = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
};

type Props = {
  actions: Action[];
};

export function PremiumQuickActions({ actions }: Props) {
  const { colors, type, shadows } = useDesignSystem();

  return (
    <View style={styles.wrap}>
      <Text style={[type.sectionTitle, styles.title]}>Quick actions</Text>
      <View style={styles.grid}>
        {actions.map((action, index) => (
          <FloatCard key={action.label} distance={4} duration={3200} delay={index * 120}>
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ pressed }) => [styles.cell, pressed && { opacity: 0.92 }]}
          >
            <View
              style={[
                styles.tile,
                {
                  backgroundColor: action.primary ? colors.primary : colors.card,
                  borderColor: action.primary ? colors.primary : colors.borderSubtle
                },
                shadows.card
              ]}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: action.primary ? "rgba(255,255,255,0.2)" : colors.primarySoft }
                ]}
              >
                <Ionicons name={action.icon} size={22} color={action.primary ? "#FFF" : colors.primary} />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: action.primary ? "#FFF" : colors.text }
                ]}
                numberOfLines={2}
              >
                {action.label}
              </Text>
            </View>
          </Pressable>
          </FloatCard>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingHorizontal: 16 },
  title: { marginBottom: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: { width: "31%" },
  tile: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 96,
    paddingHorizontal: 8,
    paddingVertical: 12
  },
  icon: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  label: { fontSize: 12, fontWeight: "800", textAlign: "center" }
});
