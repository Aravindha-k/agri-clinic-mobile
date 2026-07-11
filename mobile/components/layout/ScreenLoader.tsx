import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { KavyaLoader } from "../KavyaLoader";
import { Colors } from "../../lib/theme";

type Props = {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  message?: string;
};

/**
 * Standard full-page / section loader for every screen.
 * Uses the branded Kavya logo pulse so loading feels consistent app-wide.
 */
export function ScreenLoader({ style, compact = false, message }: Props) {
  return (
    <KavyaLoader
      fullScreen={!compact}
      compact={compact}
      message={message}
      style={[styles.host, compact && styles.hostCompact, style]}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    backgroundColor: Colors.bg,
    minHeight: 160,
    width: "100%"
  },
  hostCompact: {
    backgroundColor: "transparent",
    minHeight: 88
  }
});
