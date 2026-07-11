import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { KavyaLoader } from "../KavyaLoader";

type Props = {
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** Compact list-footer / inline loader — same brand mark as ScreenLoader. */
export function InlineSeedLoader({ label, style }: Props) {
  return <KavyaLoader compact message={label} style={[styles.wrap, style]} />;
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 12,
    width: "100%"
  }
});
