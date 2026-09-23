import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useI18n } from "../../../src/i18n/I18nContext";
import { anyFieldStartsWithSearch } from "../../../src/utils/prefixSearch";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing, minTouchStyle } from "../../lib/theme";

export type MasterSelectItem = {
  id: string;
  title: string;
  subtitle?: string;
};

export type MasterSelectSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  title: string;
  items: MasterSelectItem[];
  selectedId?: string | null;
  loading?: boolean;
  onSelect: (item: MasterSelectItem) => void;
};

export const MasterSelectSheet = forwardRef<MasterSelectSheetRef, Props>(function MasterSelectSheet(
  { title, items, selectedId, loading, onSelect },
  ref
) {
  const insets = useSafeAreaInsetsCompat();
  const { t } = useI18n();
  const searchRef = useRef<TextInput>(null);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");

  useImperativeHandle(ref, () => ({
    open: () => {
      setVisible(true);
      setTimeout(() => searchRef.current?.focus(), 320);
    },
    close: () => {
      setVisible(false);
      setQuery("");
    }
  }));

  const filtered = useMemo(() => {
    const needle = query.trim();
    if (!needle) return items;
    return items.filter((item) => anyFieldStartsWithSearch(needle, item.title, item.subtitle));
  }, [items, query]);

  function handleClose() {
    setVisible(false);
    setQuery("");
  }

  function handleSelect(item: MasterSelectItem) {
    onSelect(item);
    handleClose();
  }

  const selectedKey = selectedId != null ? String(selectedId) : "";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.close")}
          >
            <Ionicons name="close" size={22} color={Colors.text1} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.closeBtn} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.text4} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder={t("visitFlow.search")}
            placeholderTextColor={Colors.text4}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={t("visitFlow.search")}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              style={minTouchStyle}
              accessibilityRole="button"
              accessibilityLabel={t("a11y.clearSearch")}
            >
              <Ionicons name="close-circle" size={20} color={Colors.text4} />
            </Pressable>
          ) : null}
        </View>

        {loading && items.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.brand700} />
            <Text style={styles.empty}>{t("visitFlow.loading")}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={28} color={Colors.text4} />
                <Text style={styles.empty}>
                  {items.length === 0 ? t("visitFlow.noMatches") : t("visitFlow.noMatches")}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = selectedKey !== "" && selectedKey === String(item.id);
              return (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={selected ? `${item.title}. ${t("a11y.selected")}` : item.title}
                >
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowTitle, selected && styles.rowTitleSelected]}>{item.title}</Text>
                    {item.subtitle ? <Text style={styles.rowSub}>{item.subtitle}</Text> : null}
                  </View>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "chevron-forward"}
                    size={20}
                    color={selected ? Colors.brand700 : Colors.text4}
                  />
                </Pressable>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  header: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingHorizontal: Spacing.screen,
    paddingVertical: 6
  },
  closeBtn: {
    ...minTouchStyle
  },
  pressed: {
    opacity: 0.72
  },
  title: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: Layout.touchTargetMin,
    marginHorizontal: Spacing.screen,
    marginTop: 12,
    paddingHorizontal: 12
  },
  searchInput: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0
  },
  list: {
    flex: 1,
    marginTop: 8
  },
  listContent: {
    paddingHorizontal: Spacing.screen
  },
  row: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  rowSelected: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand700
  },
  rowPressed: {
    opacity: 0.92
  },
  rowBody: {
    flex: 1,
    gap: 2
  },
  rowTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  rowTitleSelected: {
    color: Colors.brand700
  },
  rowSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  center: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: Spacing.screen
  },
  emptyWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32
  },
  empty: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    textAlign: "center"
  }
});
