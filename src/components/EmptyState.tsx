import { StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { BrandLogo } from "./brand/BrandLogo";
import { EmptyIllustrationVariant, EmptyStateIllustration } from "./EmptyStateIllustration";
import { FadeInView } from "./FadeInView";
import { PrimaryButton } from "./ui/PrimaryButton";

type Props = {
  title: string;
  message?: string;
  illustration?: EmptyIllustrationVariant;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, illustration = "generic", actionLabel, onAction }: Props) {
  const { colors, type } = useDesignSystem();

  return (
    <FadeInView style={styles.state}>
      <View style={[styles.logoMark, { backgroundColor: colors.primarySoft }]}>
        <BrandLogo variant="watermark" />
      </View>
      <EmptyStateIllustration variant={illustration} />
      <Text style={[type.sectionTitle, styles.title]}>{title}</Text>
      {message ? <Text style={[type.meta, styles.message]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton title={actionLabel} variant="secondary" onPress={onAction} style={styles.action} />
      ) : null}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 28 },
  logoMark: { borderRadius: 999, marginBottom: 6, opacity: 0.9, padding: 4 },
  title: { textAlign: "center" },
  message: { marginTop: 8, textAlign: "center" },
  action: { marginTop: 16, minWidth: 180 }
});
