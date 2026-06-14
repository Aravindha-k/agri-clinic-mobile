import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { PremiumCard } from "../brand/PremiumCard";

type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  hint?: string;
};

export function VisitSectionCard({ title, icon, children, hint }: Props) {
  const { colors, layout, type } = useDesignSystem();

  return (
    <PremiumCard elevated style={styles.card}>
      <View style={styles.head}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={icon} size={18} color={colors.primaryDark} />
          </View>
        ) : null}
        <View style={styles.headText}>
          <Text style={[type.sectionTitle, { fontSize: 15 }]}>{title}</Text>
          {hint ? <Text style={[type.caption, { marginTop: 2 }]}>{hint}</Text> : null}
        </View>
      </View>
      <View style={[styles.body, { gap: layout.screenGap }]}>{children}</View>
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  head: { alignItems: "center", flexDirection: "row", gap: 10 },
  iconWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  headText: { flex: 1 },
  body: {}
});
