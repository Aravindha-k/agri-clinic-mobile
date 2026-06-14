import { Ionicons } from "@expo/vector-icons";
import { Linking, StyleSheet, Text, View } from "react-native";
import type { Farmer } from "../../api/farmers";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { FarmerPhotoPicker } from "../FarmerPhotoPicker";
import { PrimaryButton } from "../ui/PrimaryButton";

type Props = {
  farmer: Farmer;
  villageLabel: string;
  onFarmerUpdated: (farmer: Farmer) => void;
  onNewVisit: () => void;
};

export function FarmerProfileHeader({ farmer, villageLabel, onFarmerUpdated, onNewVisit }: Props) {
  const { colors, type, shadows } = useDesignSystem();
  const phone = farmer.phone?.trim();
  const canCall = Boolean(phone);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.elevated]}>
      <FarmerPhotoPicker farmer={farmer} compact onFarmerUpdated={onFarmerUpdated} />
      <View style={styles.copy}>
        <Text style={type.pageTitle}>{farmer.name || "Farmer"}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={[type.meta, { flex: 1 }]} numberOfLines={2}>
            {villageLabel}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="call-outline" size={16} color={colors.muted} />
          <Text style={type.meta}>{phone || "No phone on file"}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {canCall ? (
          <PrimaryButton
            title="Call"
            variant="secondary"
            onPress={() => Linking.openURL(`tel:${phone}`)}
            style={styles.btn}
          />
        ) : null}
        <PrimaryButton title="New visit" onPress={onNewVisit} style={styles.btn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    padding: 16
  },
  copy: { gap: 6 },
  metaRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  actions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1 }
});
