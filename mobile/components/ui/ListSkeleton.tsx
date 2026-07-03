import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Colors, Enterprise, Spacing } from "../../lib/theme";
import { Skeleton } from "./Skeleton";

type Props = {
  variant?: "farmer" | "visit";
  count?: number;
};

function FarmerRowSkeleton() {
  return (
    <View style={styles.farmerRow}>
      <Skeleton width="55%" height={16} borderRadius={8} />
      <Skeleton width="35%" height={12} borderRadius={6} />
      <Skeleton width="70%" height={12} borderRadius={6} />
      <View style={styles.actionRow}>
        <Skeleton width="28%" height={40} borderRadius={Enterprise.radius.button} />
        <Skeleton width="28%" height={40} borderRadius={Enterprise.radius.button} />
        <Skeleton width="38%" height={40} borderRadius={Enterprise.radius.button} />
      </View>
    </View>
  );
}

function VisitRowSkeleton() {
  return (
    <View style={styles.visitRow}>
      <Skeleton width="40%" height={14} borderRadius={6} />
      <Skeleton width="85%" height={16} borderRadius={8} />
      <Skeleton width="60%" height={12} borderRadius={6} />
    </View>
  );
}

export const ListSkeleton = memo(function ListSkeleton({ variant = "farmer", count = 5 }: Props) {
  const Row = variant === "visit" ? VisitRowSkeleton : FarmerRowSkeleton;
  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }, (_, index) => (
        <Row key={index} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm
  },
  farmerRow: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Enterprise.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    padding: Spacing.lg
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs
  },
  visitRow: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Enterprise.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    padding: Spacing.lg
  }
});
