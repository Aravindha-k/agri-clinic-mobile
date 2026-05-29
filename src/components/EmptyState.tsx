import { StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { AppLogo } from "./brand/AppLogo";
import { EmptyIllustrationVariant, EmptyStateIllustration } from "./EmptyStateIllustration";
import { FadeInView } from "./FadeInView";

type Props = {
  title: string;
  message?: string;
  illustration?: EmptyIllustrationVariant;
};

export function EmptyState({ title, message, illustration = "generic" }: Props) {
  const { colors, type } = useDesignSystem();

  return (
    <FadeInView style={styles.state}>
      <View style={[styles.logoMark, { backgroundColor: colors.primarySoft }]}>
        <AppLogo size="xs" />
      </View>
      <EmptyStateIllustration variant={illustration} />
      <Text style={[type.sectionTitle, styles.title]}>{title}</Text>
      {message ? <Text style={[type.meta, styles.message]}>{message}</Text> : null}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 28 },
  logoMark: { borderRadius: 999, marginBottom: 6, opacity: 0.9, padding: 4 },
  title: { textAlign: "center" },
  message: { marginTop: 8, textAlign: "center" }
});
