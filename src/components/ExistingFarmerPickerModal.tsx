import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Farmer } from "../api/farmers";
import { ProfileAvatar } from "./ProfileAvatar";
import { farmerMatchesSearch } from "../utils/farmerSearch";
import { extractPhotoUrl } from "../utils/profilePhotoUrl";
import { useSafeAreaInsetsCompat } from "../hooks/useSafeAreaInsetsCompat";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";

type Props = {
  visible: boolean;
  farmers: Farmer[];
  onClose: () => void;
  onSelect: (farmer: Farmer) => void;
};

export function ExistingFarmerPickerModal({ visible, farmers, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsetsCompat();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => farmers.filter((f) => farmerMatchesSearch(f, query)), [farmers, query]);

  function handleSelect(farmer: Farmer) {
    setQuery("");
    onSelect(farmer);
    onClose();
  }

  function handleClose() {
    setQuery("");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={handleClose} accessibilityLabel="Close picker" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Choose existing farmer</Text>
          <Text style={styles.subtitle}>Search the directory. To register someone new, close this and enter their details on the form.</Text>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, mobile, village, crop…"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              autoFocus
            />
            {query.length ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {query.trim() ? "No farmers match your search." : "No farmers loaded yet. Pull to refresh the Farmers tab or try again."}
              </Text>
            }
            renderItem={({ item }) => {
              const place = [item.village_name || item.village, item.district_name || item.district].filter(Boolean).join(", ");
              return (
                <Pressable onPress={() => handleSelect(item)} style={styles.row} accessibilityRole="button">
                  <ProfileAvatar name={item.name} photoUrl={extractPhotoUrl(item)} size="sm" />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{item.name || "Farmer"}</Text>
                    <Text style={styles.rowMeta} numberOfLines={2}>
                      {[item.phone, place].filter(Boolean).join(" · ") || "No details"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              );
            }}
          />

          <Pressable onPress={handleClose} style={styles.cancelBtn} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 81, 50, 0.45)"
  },
  dismissArea: {
    flex: 1
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "78%",
    paddingHorizontal: space.lg,
    paddingTop: space.md
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 3,
    height: 4,
    marginBottom: space.md,
    width: 40
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: space.md,
    marginTop: space.xs
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.md,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 0
  },
  list: {
    flexGrow: 0
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: space.md,
    paddingVertical: 14
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  rowBody: {
    flex: 1,
    minWidth: 0
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: space.xl,
    textAlign: "center"
  },
  cancelBtn: {
    alignItems: "center",
    marginTop: space.md,
    paddingVertical: space.md
  },
  cancelText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "800"
  }
});
