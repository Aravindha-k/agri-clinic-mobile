import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MasterOption } from "../../api/masters";
import { getOptionLabel } from "../../api/masters";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { buildCropSuggestions, type CropSuggestion } from "../../utils/cropSuggestions";
import type { Visit } from "../../api/visits";
import { SearchableSelectModal, type SearchableSelectItem } from "../ui/SearchableSelectModal";

type Props = {
  crops: MasterOption[];
  value: string;
  farmerCropName?: string | null;
  recentVisits?: Visit[];
  error?: string;
  onChange: (cropId: string, label?: string) => void;
};

function CropChip({
  item,
  selected,
  onPress
}: {
  item: CropSuggestion;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, type, shadows } = useDesignSystem();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primarySoft : colors.card,
          borderColor: selected ? colors.primary : colors.borderSubtle,
          opacity: pressed ? 0.92 : 1
        },
        shadows.card
      ]}
    >
      <Ionicons name="leaf" size={16} color={selected ? colors.primaryDark : colors.primary} />
      <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={1}>
        {item.label}
      </Text>
      {item.source === "farmer" ? (
        <Text style={[type.caption, { color: colors.muted }]}>Farmer crop</Text>
      ) : null}
    </Pressable>
  );
}

export function CropPickerSection({ crops, value, farmerCropName, recentVisits, error, onChange }: Props) {
  const { colors, type } = useDesignSystem();
  const [browseOpen, setBrowseOpen] = useState(false);
  const { recent, frequent } = useMemo(
    () => buildCropSuggestions({ crops, visits: recentVisits, farmerCropName }),
    [crops, recentVisits, farmerCropName]
  );

  const allItems: SearchableSelectItem[] = useMemo(
    () =>
      crops.map((c) => ({
        id: String(c.id),
        title: getOptionLabel(c),
        tamilTitle: c.name_ta || undefined
      })),
    [crops]
  );

  return (
    <View style={{ gap: 12 }}>
      {recent.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={type.label}>Recent crops</Text>
          <View style={styles.row}>
            {recent.map((item) => (
              <CropChip
                key={`r-${item.id}`}
                item={item}
                selected={value === item.id}
                onPress={() => onChange(item.id, item.label)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {frequent.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={type.label}>Frequently used</Text>
          <View style={styles.row}>
            {frequent.map((item) => (
              <CropChip
                key={`f-${item.id}`}
                item={item}
                selected={value === item.id}
                onPress={() => onChange(item.id, item.label)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() => setBrowseOpen(true)}
        style={({ pressed }) => [
          styles.browse,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.danger : colors.borderSubtle,
            opacity: pressed ? 0.94 : 1
          }
        ]}
      >
        <Ionicons name="search-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={type.label}>All crops</Text>
          <Text style={[type.bodyStrong, { color: value ? colors.text : colors.muted }]}>
            {value ? allItems.find((i) => i.id === value)?.title || "Selected" : "Browse full crop list"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      {error ? <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "700" }}>{error}</Text> : null}

      <SearchableSelectModal
        visible={browseOpen}
        title="Select crop"
        placeholder="Search crop name"
        items={allItems}
        onClose={() => setBrowseOpen(false)}
        onSelect={(row) => {
          onChange(row.id, row.title);
          setBrowseOpen(false);
        }}
        emptyMessage="No crops match your search."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    minWidth: "30%",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  browse: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    padding: 14
  }
});
