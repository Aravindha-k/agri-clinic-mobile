import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../../mobile/lib/theme";

type Props = {
  syncing: boolean;
  hasPending: boolean;
};

export const MyLocationSyncChip = memo(function MyLocationSyncChip({ syncing, hasPending }: Props) {
  const { t } = useI18n();
  const label = syncing || hasPending ? t("myLocation.syncing") : t("myLocation.allSynced");
  const tone = syncing || hasPending ? "amber" : "green";

  return (
    <View
      style={[
        styles.chip,
        tone === "amber" ? styles.chipAmber : styles.chipGreen
      ]}
    >
      <Text style={[styles.text, tone === "amber" ? styles.textAmber : styles.textGreen]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6
  },
  chipAmber: {
    backgroundColor: Colors.amberBg
  },
  chipGreen: {
    backgroundColor: Colors.greenBg
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold
  },
  textAmber: {
    color: Colors.amberText
  },
  textGreen: {
    color: Colors.greenText
  }
});
