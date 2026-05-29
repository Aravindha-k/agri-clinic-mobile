import { StyleSheet, View } from "react-native";
import { Skeleton } from "./Skeleton";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";

export function DashboardSkeleton() {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Skeleton width={52} height={52} borderRadius={26} />
        <View style={styles.headerText}>
          <Skeleton width="70%" height={22} />
          <Skeleton width="50%" height={14} style={{ marginTop: space.sm }} />
        </View>
      </View>
      <Skeleton height={88} borderRadius={18} />
      <Skeleton height={120} borderRadius={18} />
      <View style={styles.row}>
        <Skeleton height={72} style={styles.metric} borderRadius={18} />
        <Skeleton height={72} style={styles.metric} borderRadius={18} />
        <Skeleton height={72} style={styles.metric} borderRadius={18} />
      </View>
      <Skeleton height={64} borderRadius={16} />
      <Skeleton height={64} borderRadius={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    flex: 1,
    gap: space.lg,
    padding: space.lg
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: space.md
  },
  headerText: {
    flex: 1
  },
  row: {
    flexDirection: "row",
    gap: space.sm + 2
  },
  metric: {
    flex: 1
  }
});
