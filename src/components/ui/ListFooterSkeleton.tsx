import { StyleSheet, View } from "react-native";
import { Skeleton } from "../Skeleton";

export function ListFooterSkeleton() {
  return (
    <View style={styles.wrap}>
      <Skeleton width="100%" height={72} borderRadius={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 12 }
});
