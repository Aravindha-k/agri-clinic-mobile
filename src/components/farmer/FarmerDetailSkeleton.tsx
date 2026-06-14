import { StyleSheet, View } from "react-native";
import { Skeleton } from "../Skeleton";
import { useDesignSystem } from "../../hooks/useDesignSystem";

export function FarmerDetailSkeleton() {
  const { colors } = useDesignSystem();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Skeleton width={72} height={72} borderRadius={20} />
        <View style={styles.headerCopy}>
          <Skeleton width="70%" height={22} />
          <Skeleton width="50%" height={14} style={{ marginTop: 10 }} />
          <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Skeleton width="60%" height={28} />
          <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Skeleton width="60%" height={28} />
          <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Skeleton width="50%" height={28} />
          <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Skeleton width="50%" height={28} />
          <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Skeleton width="100%" height={40} borderRadius={999} />
      <View style={[styles.panelCard, { backgroundColor: colors.card }]}>
        <Skeleton width="45%" height={18} />
        <Skeleton width="90%" height={14} style={{ marginTop: 12 }} />
        <Skeleton width="75%" height={14} style={{ marginTop: 8 }} />
      </View>
      <View style={[styles.panelCard, { backgroundColor: colors.card }]}>
        <Skeleton width="40%" height={18} />
        <Skeleton width="85%" height={14} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 14, padding: 16, paddingTop: 8 },
  headerCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 14,
    padding: 16
  },
  headerCopy: { flex: 1 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { borderRadius: 16, flex: 1, padding: 14 },
  panelCard: { borderRadius: 16, padding: 16 }
});
