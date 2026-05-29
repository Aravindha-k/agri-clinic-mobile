import { StyleSheet, View } from "react-native";
import { Skeleton } from "./Skeleton";
import { space } from "../theme/layout";

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton width="55%" height={18} />
          <Skeleton width="40%" height={12} style={{ marginTop: space.sm }} />
          <Skeleton width="80%" height={12} style={{ marginTop: space.sm }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.md
  },
  card: {
    paddingVertical: space.xs
  }
});
