import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Farmer, fetchFarmersPage } from "../api/farmers";
import { ProfileAvatar } from "./ProfileAvatar";
import { ListFooterSkeleton } from "./ui/ListFooterSkeleton";
import { extractPhotoUrl } from "../utils/profilePhotoUrl";
import { useSafeAreaInsetsCompat } from "../hooks/useSafeAreaInsetsCompat";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 50;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (farmer: Farmer) => void;
};

export function ExistingFarmerPickerModal({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsetsCompat();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const loadFirstPage = useCallback(async (search: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++requestId.current;
    setLoading(true);
    setLoadError("");
    setNextUrl(null);
    setTotalCount(null);
    try {
      const page = await fetchFarmersPage({
        search: search || undefined,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
        source: "ExistingFarmerPickerModal"
      });
      if (controller.signal.aborted || id !== requestId.current) return;
      setFarmers(page.results);
      setNextUrl(page.next);
      setTotalCount(page.count);
    } catch (err) {
      if (controller.signal.aborted || id !== requestId.current) return;
      setFarmers([]);
      setNextUrl(null);
      setTotalCount(null);
      setLoadError(err instanceof Error ? err.message : "Could not search farmers.");
    } finally {
      if (!controller.signal.aborted && id === requestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadFirstPage(debouncedQuery);
    return () => {
      abortRef.current?.abort();
    };
  }, [visible, debouncedQuery, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextUrl || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await fetchFarmersPage({ nextUrl, source: "ExistingFarmerPickerModal" });
      setFarmers((current) => {
        const seen = new Set(current.map((f) => f.id));
        const merged = [...current];
        for (const row of page.results) {
          if (!seen.has(row.id)) {
            merged.push(row);
          }
        }
        return merged;
      });
      setNextUrl(page.next);
      if (page.count != null) {
        setTotalCount(page.count);
      }
    } catch {
      // keep loaded rows
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, nextUrl]);

  function handleSelect(farmer: Farmer) {
    setQuery("");
    onSelect(farmer);
    onClose();
  }

  function handleClose() {
    setQuery("");
    onClose();
  }

  const countLine = (() => {
    const shown = farmers.length;
    const total = totalCount ?? shown;
    if (debouncedQuery) {
      return `${shown} match${shown === 1 ? "" : "es"}${totalCount != null ? ` · ${total} in directory` : ""}`;
    }
    if (totalCount != null && totalCount > shown) {
      return `Showing ${shown} of ${total} — scroll for more or search`;
    }
    return totalCount != null ? `${total} farmers in directory` : `${shown} farmers`;
  })();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={handleClose} accessibilityLabel="Close picker" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Choose existing farmer</Text>
          <Text style={styles.subtitle}>
            Search the full directory, or scroll to load more farmers.
          </Text>

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

          {!loading && !loadError ? <Text style={styles.countLine}>{countLine}</Text> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

          <View style={styles.listWrap}>
            {loading && farmers.length === 0 ? (
              <ListFooterSkeleton />
            ) : (
              <FlashList
                data={farmers}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                onEndReached={() => void loadMore()}
                onEndReachedThreshold={0.35}
                ListFooterComponent={loadingMore ? <ListFooterSkeleton /> : null}
                ListEmptyComponent={
                  !loading ? (
                    <Text style={styles.empty}>
                      {debouncedQuery ? "No farmers match your search." : "No farmers in directory."}
                    </Text>
                  ) : null
                }
                renderItem={({ item }) => {
                  const place = [item.village_name || item.village, item.district_name || item.district]
                    .filter(Boolean)
                    .join(", ");
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
            )}
          </View>

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
    height: "78%",
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
    marginBottom: space.sm,
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
  countLine: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: space.sm
  },
  listWrap: {
    flex: 1,
    minHeight: 120
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: space.md,
    paddingVertical: 14
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
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: space.sm,
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
