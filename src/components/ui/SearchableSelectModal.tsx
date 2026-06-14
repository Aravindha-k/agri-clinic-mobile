import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { useTheme } from "../../theme";
import { space } from "../../theme/layout";

export type SearchableSelectItem = {
  id: string;
  title: string;
  subtitle?: string;
  tamilTitle?: string;
  meta?: string;
};

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  items: SearchableSelectItem[];
  loading?: boolean;
  onClose: () => void;
  onSelect: (item: SearchableSelectItem) => void;
  emptyMessage?: string;
  /** When set, search is delegated to parent (server-side). */
  onSearchChange?: (query: string) => void;
  remoteSearch?: boolean;
};

function matchesLocal(item: SearchableSelectItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [item.title, item.subtitle, item.tamilTitle, item.meta].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

export function SearchableSelectModal({
  visible,
  title,
  placeholder = "Search…",
  items,
  loading = false,
  onClose,
  onSelect,
  emptyMessage = "No matches found.",
  onSearchChange,
  remoteSearch = false
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsetsCompat();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) {
      setQuery("");
    }
  }, [visible]);

  useEffect(() => {
    if (remoteSearch && onSearchChange) {
      onSearchChange(query);
    }
  }, [query, remoteSearch, onSearchChange]);

  const filtered = useMemo(() => {
    if (remoteSearch) return items;
    return items.filter((item) => matchesLocal(item, query));
  }, [items, query, remoteSearch]);

  function handleClose() {
    setQuery("");
    onClose();
  }

  function handleSelect(item: SearchableSelectItem) {
    setQuery("");
    onSelect(item);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={28} color={c.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.searchWrap, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="search" size={20} color={c.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={c.muted}
            style={[styles.searchInput, { color: c.text }]}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={22} color={c.muted} />
            </Pressable>
          ) : null}
        </View>

        {loading && filtered.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.primary} size="large" />
            <Text style={[styles.loadingText, { color: c.muted }]}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, space.lg) }]}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: c.muted }]}>
                {loading ? "Loading…" : query.trim() ? emptyMessage : "Nothing to show yet."}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: c.border, backgroundColor: pressed ? c.primarySoft : c.card }
                ]}
                accessibilityRole="button"
              >
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: c.text }]}>{item.title}</Text>
                  {item.tamilTitle ? (
                    <Text style={[styles.rowTamil, { color: c.textSecondary }]}>{item.tamilTitle}</Text>
                  ) : null}
                  {item.subtitle ? (
                    <Text style={[styles.rowSubtitle, { color: c.muted }]} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                  {item.meta ? (
                    <Text style={[styles.rowMeta, { color: c.primaryDark }]} numberOfLines={1}>
                      {item.meta}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.muted} />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: space.md,
    paddingVertical: space.sm
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", textAlign: "center" },
  headerSpacer: { width: 28 },
  searchWrap: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: space.md,
    marginTop: space.md,
    minHeight: 52,
    paddingHorizontal: space.md
  },
  searchInput: { flex: 1, fontSize: 17, fontWeight: "600", minHeight: 48, paddingVertical: 10 },
  list: { paddingTop: space.sm },
  row: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: space.md,
    paddingVertical: 14
  },
  rowBody: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  rowTamil: { fontSize: 14, fontWeight: "600" },
  rowSubtitle: { fontSize: 13, lineHeight: 18 },
  rowMeta: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  empty: { fontSize: 15, fontWeight: "600", padding: space.xl, textAlign: "center" },
  center: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: space.xl },
  loadingText: { fontSize: 14, fontWeight: "600" }
});
