import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
};

function parseDate(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) return new Date();
  const d = new Date(trimmed.includes("T") ? trimmed : `${trimmed}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function formatDate(value: string) {
  if (!value.trim()) return "";
  const d = parseDate(value);
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function DatePickerField({ label, value, onChange, minimumDate }: Props) {
  const { colors, radius, layout, type } = useDesignSystem();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseDate(value));
  const date = useMemo(() => parseDate(value), [value]);
  const display = formatDate(value);

  function applyDate(next: Date) {
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, "0");
    const d = String(next.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setOpen(false);
    }
    if (event.type === "dismissed") {
      setOpen(false);
      return;
    }
    if (selected) {
      applyDate(selected);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={[type.label, { color: colors.muted }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setDraft(date);
          setOpen(true);
        }}
        style={[
          styles.control,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.input,
            minHeight: layout.inputMinHeight
          }
        ]}
      >
        <Text style={[styles.value, { color: display ? colors.text : colors.muted }]}>
          {display || "Pick a date"}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.primaryDark} />
      </Pressable>

      {open && Platform.OS === "android" ? (
        <DateTimePicker value={date} mode="date" display="default" onChange={onPickerChange} minimumDate={minimumDate} />
      ) : null}

      {open && Platform.OS === "ios" ? (
        <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHead}>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={{ color: colors.muted, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Text style={[type.bodyStrong, { color: colors.text }]}>{label}</Text>
              <Pressable
                onPress={() => {
                  applyDate(draft);
                  setOpen(false);
                }}
              >
                <Text style={{ color: colors.primaryDark, fontWeight: "800" }}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              onChange={(event, selected) => {
                if (selected) setDraft(selected);
                onPickerChange(event, selected);
              }}
              minimumDate={minimumDate}
              style={styles.iosPicker}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  control: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  value: { fontSize: 16, fontWeight: "700" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.35)", flex: 1 },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24
  },
  sheetHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  iosPicker: { height: 220 }
});
