import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
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
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

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
  loading?: boolean;
  onSelect: (item: MasterSelectItem) => void;
};

export const MasterSelectSheet = forwardRef<MasterSelectSheetRef, Props>(function MasterSelectSheet(
  { title, items, loading, onSelect },
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
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const hay = [item.title, item.subtitle].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [items, query]);

  function handleClose() {
    setVisible(false);
    setQuery("");
  }

  function handleSelect(item: MasterSelectItem) {
    onSelect(item);
    handleClose();
  }

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
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={Colors.text1} />
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
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={Colors.text4} />
            </Pressable>
          ) : null}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
          ListEmptyComponent={
            <Text style={styles.empty}>{loading ? t("visitFlow.loading") : t("visitFlow.noMatches")}</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.rowSub}>{item.subtitle}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.text4} />
            </Pressable>
          )}
        />
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
    paddingVertical: 10
  },
  closeBtn: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36
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
    height: 48,
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
    paddingHorizontal: 14,
    paddingVertical: 12
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
  rowSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  empty: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    paddingVertical: 32,
    textAlign: "center"
  }
});
