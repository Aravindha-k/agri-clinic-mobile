import { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import AuroraBackground, { type AuroraBlob, DEFAULT_BLOBS } from "./AuroraBackground";
import { CINEMATIC_BG } from "./presets";

type Props = {
  children: ReactNode;
  blobs?: AuroraBlob[];
  style?: ViewStyle;
  edges?: Edge[];
};

/** Root screen shell — dark green bg + aurora blobs. */
export function CinematicScreen({ children, blobs = DEFAULT_BLOBS, style, edges = ["top"] }: Props) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges}>
      <AuroraBackground blobs={blobs} />
      {children}
    </SafeAreaView>
  );
}

export function CinematicRoot({ children, blobs = DEFAULT_BLOBS, style }: Omit<Props, "edges">) {
  return (
    <View style={[styles.screen, style]}>
      <AuroraBackground blobs={blobs} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: CINEMATIC_BG,
    flex: 1
  }
});
