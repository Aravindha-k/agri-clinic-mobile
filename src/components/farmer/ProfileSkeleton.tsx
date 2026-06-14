import { StyleSheet, View } from "react-native";
import { Skeleton } from "../Skeleton";
import { useDesignSystem } from "../../hooks/useDesignSystem";

export function ProfileSkeleton() {
  const { colors } = useDesignSystem();
  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { backgroundColor: colors.card }]}>
        <Skeleton width={88} height={88} borderRadius={24} />
        <Skeleton width="60%" height={24} style={{ marginTop: 14 }} />
        <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="50%" height={14} style={{ marginTop: 6 }} />
      </View>
      <View style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: colors.card }]}>
          <Skeleton width="50%" height={28} />
          <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
        </View>
        <View style={[styles.stat, { backgroundColor: colors.card }]}>
          <Skeleton width="50%" height={28} />
          <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
        </View>
        <View style={[styles.stat, { backgroundColor: colors.card }]}>
          <Skeleton width="50%" height={28} />
          <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16, padding: 16 },
  hero: { alignItems: "center", borderRadius: 18, padding: 20 },
  stats: { flexDirection: "row", gap: 10 },
  stat: { borderRadius: 16, flex: 1, padding: 14 }
});
