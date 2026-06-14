import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ProblemItem } from "../../../../src/api/problems";
import { useI18n } from "../../../../src/i18n/I18nContext";
import { formatCategoryBadgeLocalized } from "../../../lib/problemCatalog";
import { Colors, FontSize, FontWeight, Radius } from "../../../lib/theme";

type Props = {
  item: ProblemItem;
  cropName: string;
  selected: boolean;
  onPress: () => void;
};

export function ProblemSelectCard({ item, cropName, selected, onPress }: Props) {
  const { t, language } = useI18n();
  const categoryLabel = formatCategoryBadgeLocalized(item.category, undefined, language);
  const displayCrop = item.crop_name || cropName;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.body}>
        <Text style={styles.tamil} numberOfLines={2}>
          {item.tamil_name?.trim() || item.name}
        </Text>
        {item.tamil_name?.trim() ? (
          <Text style={styles.english} numberOfLines={1}>
            {item.name}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {displayCrop ? (
            <Text style={styles.meta}>
              {t("visitFlow.cropMeta")}: {displayCrop}
            </Text>
          ) : null}
          {categoryLabel ? (
            <>
              {displayCrop ? <Text style={styles.metaDot}>•</Text> : null}
              <Text style={styles.meta}>
                {t("visitFlow.category")}: {categoryLabel}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={Colors.green} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  cardSelected: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
    borderWidth: 1.5
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  tamil: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  english: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2
  },
  meta: {
    color: Colors.text4,
    fontSize: 11
  },
  metaDot: {
    color: Colors.text4,
    fontSize: 11
  }
});
