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
import { getOptionLabel } from "../../../src/api/masters";
import type { MasterOption } from "../../../src/api/masters";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

export type VillageFilterSheetRef = {
  open: () => void;
  close: () => void;
};

type VillageRow = {
  id: string;
  title: string;
  district: string;
};

type Props = {
  villages: MasterOption[];
  onSelect: (villageId: string, villageName: string) => void;
};

function groupVillages(villages: MasterOption[]): VillageRow[] {
  return villages.map((v) => ({
    id: String(v.id),
    title: getOptionLabel(v),
    district: v.district_name || "Other"
  }));
}

export const VillageFilterSheet = forwardRef<VillageFilterSheetRef, Props>(function VillageFilterSheet(
  { villages, onSelect },
  ref
) {
  const insets = useSafeAreaInsetsCompat();
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

  const rows = useMemo(() => {
    const all = groupVillages(villages);
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (row) => row.title.toLowerCase().includes(needle) || row.district.toLowerCase().includes(needle)
    );
  }, [query, villages]);

  const sections = useMemo(() => {
    const map = new Map<string, VillageRow[]>();
    for (const row of rows) {
      const bucket = map.get(row.district) ?? [];
      bucket.push(row);
      map.set(row.district, bucket);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const flatData = useMemo(
    () =>
      sections.flatMap(([district, items]) => [
        { type: "header" as const, key: `h-${district}`, district },
        ...items.map((item) => ({ type: "row" as const, key: item.id, item }))
      ]),
    [sections]
  );

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
          <Text style={styles.title}>Filter by village</Text>
          <View style={styles.closeBtn} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.text4} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search village or district"
            placeholderTextColor={Colors.text4}
            style={styles.searchInput}
          />
        </View>

        <FlatList
          data={flatData}
          keyExtractor={(entry) => entry.key}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <Text style={styles.districtHeader}>{item.district}</Text>;
            }
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.item.id, item.item.title);
                  handleClose();
                }}
                style={({ pressed }) => [styles.villageRow, pressed && { opacity: 0.92 }]}
              >
                <Text style={styles.villageName}>{item.item.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.text4} />
              </Pressable>
            );
          }}
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
  districtHeader: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: 6,
    marginTop: 12,
    textTransform: "uppercase"
  },
  villageRow: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  villageName: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium
  }
});
