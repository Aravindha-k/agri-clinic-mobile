import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "../../../../src/i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius } from "../../../lib/theme";

export type OtherProblemSectionRef = {
  focusInput: () => void;
};

type Props = {
  active: boolean;
  description: string;
  onActivate: () => void;
  onChangeDescription: (value: string) => void;
};

export const OtherProblemSection = forwardRef<OtherProblemSectionRef, Props>(function OtherProblemSection(
  { active, description, onActivate, onChangeDescription },
  ref
) {
  const { t } = useI18n();
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({
    focusInput: () => inputRef.current?.focus()
  }));

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onActivate}
        style={[styles.trigger, active && styles.triggerActive]}
      >
        <View style={styles.triggerCopy}>
          <Text style={styles.triggerTitle}>{t("visitFlow.cantFindProblem")}</Text>
          <Text style={styles.triggerSub}>{t("visitFlow.describeManually")}</Text>
        </View>
        {active ? (
          <Ionicons name="checkmark-circle" size={22} color={Colors.green} />
        ) : (
          <Ionicons name="create-outline" size={20} color={Colors.brand700} />
        )}
      </Pressable>
      {active ? (
        <TextInput
          ref={inputRef}
          value={description}
          onChangeText={onChangeDescription}
          placeholder={t("visitFlow.describeIssuePlaceholder")}
          placeholderTextColor={Colors.text4}
          multiline
          autoFocus
          style={styles.input}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: 8
  },
  trigger: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  triggerActive: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
    borderStyle: "solid"
  },
  triggerCopy: {
    flex: 1,
    gap: 2
  },
  triggerTitle: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  triggerSub: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: Colors.text1,
    fontSize: FontSize.md,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top"
  }
});
