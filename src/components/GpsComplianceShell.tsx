import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/** Pass-through shell — GPS prompts only when starting workday or submitting visits. */
export function GpsComplianceShell({ children }: { children: ReactNode }) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }
});
