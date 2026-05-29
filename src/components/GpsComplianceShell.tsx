import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useAuth } from "../storage/AuthContext";
import { GpsComplianceBanner } from "./GpsComplianceBanner";

/** Global GPS status banner (does not block navigation). */
export function GpsComplianceShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <View style={styles.root}>
      {isAuthenticated ? <GpsComplianceBanner /> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 }
});
