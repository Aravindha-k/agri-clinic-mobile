import { StyleSheet, View } from "react-native";
import { FlatCard } from "../layout/FlatCard";
import { ShimmerBlock } from "../ui/ShimmerBlock";
import { Grid, PremiumRadius } from "../../lib/designSystem";
import { Spacing } from "../../lib/theme";

/** Shimmer loading placeholders for Today dashboard blocks. */
export function TabDashboardSkeleton() {
  return (
    <View style={styles.wrap}>
      <FlatCard padded={false} style={styles.heroCard}>
        <ShimmerBlock width="55%" height={18} />
        <ShimmerBlock width="80%" height={14} style={styles.gap} />
        <ShimmerBlock width="100%" height={48} borderRadius={PremiumRadius.md} style={styles.gapLg} />
      </FlatCard>
      <View style={styles.planRow}>
        <FlatCard padded={false} style={styles.planCard}>
          <ShimmerBlock width="60%" height={12} />
          <ShimmerBlock width="45%" height={30} style={styles.gap} />
          <ShimmerBlock width="90%" height={12} style={styles.gap} />
        </FlatCard>
        <FlatCard padded={false} style={styles.planCard}>
          <ShimmerBlock width={72} height={72} borderRadius={36} />
          <ShimmerBlock width="70%" height={12} style={styles.gap} />
        </FlatCard>
      </View>
      <FlatCard padded={false} style={styles.healthCard}>
        <ShimmerBlock width="40%" height={16} />
        <View style={styles.kpiRow}>
          <ShimmerBlock width="30%" height={64} borderRadius={PremiumRadius.sm} style={styles.kpiCell} />
          <ShimmerBlock width="30%" height={64} borderRadius={PremiumRadius.sm} style={styles.kpiCell} />
          <ShimmerBlock width="30%" height={64} borderRadius={PremiumRadius.sm} style={styles.kpiCell} />
        </View>
      </FlatCard>
      <View style={styles.kpiRow}>
        <FlatCard padded={false} style={styles.kpi}>
          <ShimmerBlock width="50%" height={22} />
          <ShimmerBlock width="70%" height={12} style={styles.gap} />
        </FlatCard>
        <FlatCard padded={false} style={styles.kpi}>
          <ShimmerBlock width="50%" height={22} />
          <ShimmerBlock width="70%" height={12} style={styles.gap} />
        </FlatCard>
        <FlatCard padded={false} style={styles.kpi}>
          <ShimmerBlock width="50%" height={22} />
          <ShimmerBlock width="70%" height={12} style={styles.gap} />
        </FlatCard>
      </View>
      <FlatCard padded={false} style={styles.listCard}>
        <ShimmerBlock width="40%" height={16} />
        <ShimmerBlock width="100%" height={56} borderRadius={PremiumRadius.sm} style={styles.gap} />
        <ShimmerBlock width="100%" height={56} borderRadius={PremiumRadius.sm} style={styles.gap} />
      </FlatCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md
  },
  heroCard: {
    gap: Spacing.sm,
    padding: Spacing.cardLg
  },
  gap: {
    marginTop: Spacing.sm
  },
  gapLg: {
    marginTop: Spacing.md
  },
  planRow: {
    flexDirection: "row",
    gap: Grid.sm
  },
  planCard: {
    flex: 1,
    padding: Grid.md
  },
  healthCard: {
    gap: Spacing.sm,
    padding: Grid.md
  },
  kpiRow: {
    flexDirection: "row",
    gap: Spacing.sm
  },
  kpiCell: {
    flex: 1
  },
  kpi: {
    flex: 1,
    padding: Spacing.md
  },
  listCard: {
    gap: Spacing.sm,
    padding: Spacing.cardLg
  }
});
