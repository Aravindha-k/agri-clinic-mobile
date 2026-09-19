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
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

export type VillageFilterSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  onSelect: (villageId: string, villageName: string) => void;
};

export const VillageFilterSheet = forwardRef<VillageFilterSheetRef, Props>(function VillageFilterSheet(
  { onSelect },
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
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={Colors.text1} />
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
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={Colors.text4} />
            </Pressable>
          ) : null}
        </View>

        {loading && villages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.brand700} />
          </View>
        ) : isEmpty || unavailable ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{t("territory.noVillagesTitle")}</Text>
            <Text style={styles.emptySub}>{t("territory.noVillagesBody")}</Text>
            <Pressable onPress={() => void refreshTerritory({ force: true })} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: Spacing.screen }}
            ListEmptyComponent={<Text style={styles.hint}>{t("visitFlow.noMatches")}</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(String(item.id), villageSelectTitle(item));
                  handleClose();
                }}
                style={styles.row}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowText}>{villageSelectTitle(item)}</Text>
                  {villageSelectSubtitle(item) ? (
                    <Text style={styles.rowSub}>{villageSelectSubtitle(item)}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.text4} />
              </Pressable>
            )}
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
  rowBody: {
    flex: 1,
    gap: 2
  },
  rowText: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  rowSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  hint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    paddingVertical: 24,
    textAlign: "center"
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
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  retryText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  }
});
