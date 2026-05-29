import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton, SecondaryButton } from "../ui";
import { useTheme } from "../../theme";

type Props = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
};

export function TextNoteModal({ visible, loading, onClose, onSubmit }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [text, setText] = useState("");

  function handleClose() {
    setText("");
    onClose();
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText("");
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text }]}>Add text note</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Describe what you observed in the field…"
            placeholderTextColor={c.muted}
            multiline
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.cardMuted }]}
            textAlignVertical="top"
          />
          <View style={styles.actions}>
            <SecondaryButton title="Cancel" onPress={handleClose} style={styles.btn} />
            <PrimaryButton
              title="Save note"
              onPress={handleSubmit}
              loading={loading}
              disabled={!text.trim()}
              style={styles.btn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "flex-end"
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
    padding: 20,
    paddingBottom: 28
  },
  title: { fontSize: 18, fontWeight: "900" },
  input: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    padding: 14
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn: { flex: 1 }
});
