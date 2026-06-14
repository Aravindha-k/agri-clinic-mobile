import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/** Pass-through shell — GPS reminders/blocking handled by GpsComplianceProvider (5 min / 30 min rules). */
export function GpsWorkdayGate({ children }: { children: ReactNode }) {
  return <View style={styles.flex}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }
});
