import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";
import { space } from "../../theme/layout";
import { SearchableSelectItem, SearchableSelectModal } from "./SearchableSelectModal";

type Props = {
  label: string;
  value: string;
  items: SearchableSelectItem[];
  placeholder?: string;
  onChange: (value: string, item?: SearchableSelectItem) => void;
  required?: boolean;
  error?: string;
  loading?: boolean;
  modalTitle?: string;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  remoteSearch?: boolean;
  onLayout?: (event: { nativeEvent: { layout: { y: number } } }) => void;
};

export function SearchableSelectField({
  label,
  value,
  items,
  placeholder = "Select",
  onChange,
  required,
  error,
  loading,
  modalTitle,
  searchPlaceholder,
  onSearchChange,
  remoteSearch,
  onLayout
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => items.find((item) => item.id === value), [items, value]);
  const hasError = Boolean(error);
  const labelText = required ? `${label} *` : label;

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <Text style={[styles.label, { color: hasError ? c.danger : c.muted }]}>{labelText}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.control,
          {
            backgroundColor: c.card,
            borderColor: hasError ? c.danger : c.border,
            borderWidth: hasError ? 1.5 : 1
          },
          pressed && styles.controlPressed
        ]}
      >
        <View style={styles.controlBody}>
          <Text style={[styles.controlValue, { color: selected ? c.text : c.muted }]} numberOfLines={2}>
            {selected?.title || placeholder}
          </Text>
          {selected?.tamilTitle ? (
            <Text style={[styles.controlHelper, { color: c.muted }]} numberOfLines={1}>
              {selected.tamilTitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="search" size={22} color={c.primaryDark} />
      </Pressable>
      {error ? <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text> : null}

      <SearchableSelectModal
        visible={open}
        title={modalTitle || label}
        placeholder={searchPlaceholder || `Search ${label.toLowerCase()}…`}
        items={items}
        loading={loading}
        onClose={() => setOpen(false)}
        onSelect={(item) => onChange(item.id, item)}
        onSearchChange={onSearchChange}
        remoteSearch={remoteSearch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xs },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  errorText: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  control: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2
  },
  controlPressed: { opacity: 0.92 },
  controlBody: { flex: 1, minWidth: 0, paddingRight: space.sm },
  controlValue: { fontSize: 16, fontWeight: "700" },
  controlHelper: { fontSize: 13, fontWeight: "600", marginTop: 2 }
});
