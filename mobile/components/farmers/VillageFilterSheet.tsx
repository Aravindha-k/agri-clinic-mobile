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
  View
} from "react-native";
import { getOptionLabel, type MasterOption } from "../../../src/api/masters";
import { useLocationCascade } from "../../../src/hooks/useLocationCascade";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { EMPTY_LOCATION_SELECTION } from "../../../src/utils/locationCascade";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

export type VillageFilterSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  villages?: MasterOption[];
  onSelect: (villageId: string, villageName: string) => void;
};

function cascadeHint(
  state: "idle" | "loading" | "error" | "empty",
  loading: string,
  empty: string,
  error: string
) {
  if (state === "loading") return loading;
  if (state === "empty") return empty;
  if (state === "error") return error;
  return "";
}

export const VillageFilterSheet = forwardRef<VillageFilterSheetRef, Props>(function VillageFilterSheet(
  { onSelect },
  ref
) {
  const insets = useSafeAreaInsetsCompat();
  const { t } = useI18n();
  const { districts: masterDistricts } = useMasterData();
  const [visible, setVisible] = useState(false);
  const [selection, setSelection] = useState(EMPTY_LOCATION_SELECTION);

  const cascade = useLocationCascade(selection, setSelection, { districts: masterDistricts });

  useImperativeHandle(ref, () => ({
    open: () => {
      setSelection(EMPTY_LOCATION_SELECTION);
      setVisible(true);
    },
    close: () => setVisible(false)
  }));

  const villageRows = useMemo(
    () =>
      cascade.villages.map((v) => ({
        id: String(v.id),
        title: getOptionLabel(v)
      })),
    [cascade.villages]
  );

  function handleClose() {
    setVisible(false);
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

        <View style={styles.body}>
          <Text style={styles.label}>{t("visitFlow.district")}</Text>
          <FlatList
            data={cascade.districts}
            keyExtractor={(item) => String(item.id)}
            style={styles.pane}
            renderItem={({ item }) => {
              const selected = selection.districtId === String(item.id);
              return (
                <Pressable
                  onPress={() => cascade.setDistrict(String(item.id))}
                  style={[styles.row, selected && styles.rowSelected]}
                >
                  <Text style={styles.rowText}>{getOptionLabel(item)}</Text>
                </Pressable>
              );
            }}
          />

          <Text style={styles.label}>{t("visitFlow.taluk")}</Text>
          {!selection.districtId ? (
            <Text style={styles.hint}>{t("visitFlow.selectDistrictFirst")}</Text>
          ) : cascade.taluksState === "loading" ? (
            <View style={styles.hintRow}>
              <ActivityIndicator size="small" color={Colors.brand700} />
              <Text style={styles.hint}>{t("visitFlow.loadingTaluks")}</Text>
            </View>
          ) : cascade.taluksState === "error" ? (
            <Pressable onPress={cascade.retryTaluks}>
              <Text style={styles.retry}>{t("visitFlow.unableToLoadRetry")}</Text>
            </Pressable>
          ) : (
            <FlatList
              data={cascade.taluks}
              keyExtractor={(item) => String(item.id)}
              style={styles.pane}
              ListEmptyComponent={<Text style={styles.hint}>{t("visitFlow.noTaluks")}</Text>}
              renderItem={({ item }) => {
                const selected = selection.talukId === String(item.id);
                return (
                  <Pressable
                    onPress={() => cascade.setTaluk(String(item.id))}
                    style={[styles.row, selected && styles.rowSelected]}
                  >
                    <Text style={styles.rowText}>{getOptionLabel(item)}</Text>
                  </Pressable>
                );
              }}
            />
          )}

          <Text style={styles.label}>{t("visitFlow.village")}</Text>
          {!selection.talukId ? (
            <Text style={styles.hint}>{t("visitFlow.selectTalukFirst")}</Text>
          ) : cascade.villagesState === "loading" ? (
            <View style={styles.hintRow}>
              <ActivityIndicator size="small" color={Colors.brand700} />
              <Text style={styles.hint}>{t("visitFlow.loadingVillages")}</Text>
            </View>
          ) : cascade.villagesState === "error" ? (
            <Pressable onPress={cascade.retryVillages}>
              <Text style={styles.retry}>{t("visitFlow.unableToLoadRetry")}</Text>
            </Pressable>
          ) : (
            <FlatList
              data={villageRows}
              keyExtractor={(item) => item.id}
              style={styles.pane}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
              ListEmptyComponent={
                <Text style={styles.hint}>
                  {cascadeHint(cascade.villagesState, "", t("visitFlow.noVillages"), "")}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.id, item.title);
                    handleClose();
                  }}
                  style={styles.row}
                >
                  <Text style={styles.rowText}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.text4} />
                </Pressable>
              )}
            />
          )}
        </View>
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
  body: {
    flex: 1,
    paddingHorizontal: Spacing.screen,
    paddingTop: 12
  },
  label: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginBottom: 6,
    marginTop: 8
  },
  pane: {
    flexGrow: 0,
    maxHeight: 160
  },
  row: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  rowSelected: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand700
  },
  rowText: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium
  },
  hint: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    paddingVertical: 8
  },
  hintRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  retry: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    paddingVertical: 8
  }
});
