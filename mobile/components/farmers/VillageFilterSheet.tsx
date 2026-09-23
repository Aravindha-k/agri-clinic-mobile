import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
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
import { useTerritory } from "../../../src/storage/TerritoryContext";
import {
  filterTerritoryVillages,
  villageSelectSubtitle,
  villageSelectTitle
} from "../../../src/utils/villageTerritory";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing, minTouchStyle } from "../../lib/theme";

export type VillageFilterSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  selectedVillageId?: string | null;
  onSelect: (villageId: string, villageName: string) => void;
};

export const VillageFilterSheet = forwardRef<VillageFilterSheetRef, Props>(function VillageFilterSheet(
  { selectedVillageId, onSelect },
  ref
) {
  const insets = useSafeAreaInsetsCompat();
  const { t } = useI18n();
  const { villages, loading, isEmpty, unavailable, refreshTerritory } = useTerritory();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");

  useImperativeHandle(ref, () => ({
    open: () => {
      setQuery("");
      setVisible(true);
    },
    close: () => setVisible(false)
  }));

  const filtered = useMemo(() => filterTerritoryVillages(villages, query), [query, villages]);
  const selectedKey = selectedVillageId != null ? String(selectedVillageId) : "";

  function handleClose() {
    setVisible(false);
    setQuery("");
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
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
          <Text style={styles.title}>{t("farmers.filterByVillage")}</Text>
          <View style={styles.closeBtn} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.text4} />
          <TextInput
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

        {loading && villages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.brand700} />
            <Text style={styles.hint}>{t("visitFlow.loadingVillages")}</Text>
          </View>
        ) : isEmpty || unavailable ? (
          <View style={styles.center}>
            <Ionicons name="location-outline" size={28} color={Colors.text4} />
            <Text style={styles.emptyTitle}>{t("territory.noVillagesTitle")}</Text>
            <Text style={styles.emptySub}>{t("territory.noVillagesBody")}</Text>
            <Pressable
              onPress={() => void refreshTerritory({ force: true })}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t("common.retry")}
            >
              <Ionicons name="refresh" size={16} color={Colors.brand700} />
              <Text style={styles.retryText}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: Spacing.screen }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={28} color={Colors.text4} />
                <Text style={styles.hint}>{t("visitFlow.noMatches")}</Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = selectedKey !== "" && selectedKey === String(item.id);
              return (
                <Pressable
                  onPress={() => {
                    onSelect(String(item.id), villageSelectTitle(item));
                    handleClose();
                  }}
                  style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={
                    selected
                      ? `${villageSelectTitle(item)}. ${t("a11y.selected")}`
                      : villageSelectTitle(item)
                  }
                >
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
                      {villageSelectTitle(item)}
                    </Text>
                    {villageSelectSubtitle(item) ? (
                      <Text style={styles.rowSub}>{villageSelectSubtitle(item)}</Text>
                    ) : null}
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
  rowText: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  rowTextSelected: {
    color: Colors.brand700
  },
  rowSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  hint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    textAlign: "center"
  },
  emptyWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32
  },
  center: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: Spacing.screen
  },
  emptyTitle: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  emptySub: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: "center"
  },
  retryBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: 16
  },
  retryText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  }
});
