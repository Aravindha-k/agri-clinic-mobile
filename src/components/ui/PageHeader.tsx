import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function PageHeader({ title, subtitle, right }: Props) {
  const { type } = useDesignSystem();

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={type.pageTitle}>{title}</Text>
        {subtitle ? <Text style={[type.meta, styles.sub]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8
  },
  copy: { flex: 1, minWidth: 0 },
  sub: { marginTop: 4 },
  right: { paddingTop: 4 }
});
