import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../../mobile/lib/theme";

type Props = {
  active: boolean;
};

export const MyLocationLivePill = memo(function MyLocationLivePill({ active }: Props) {
  const { t } = useI18n();
  if (!active) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.dot} />
      <Text style={styles.text}>{t("myLocation.live")}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(30,30,30,0.82)",
    borderRadius: Radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    position: "absolute",
    top: Spacing.sm,
    zIndex: 2
  },
  dot: {
    backgroundColor: Colors.green,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  text: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  }
});
