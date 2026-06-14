import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppInput } from "../AppInput";
import { DatePickerField } from "../ui/DatePickerField";
import { useDesignSystem } from "../../hooks/useDesignSystem";

type Props = {
  fieldNotes: string;
  actionTaken: string;
  followUpDate: string;
  suggestions: string[];
  onFieldNotesChange: (text: string) => void;
  onActionTakenChange: (text: string) => void;
  onFollowUpChange: (date: string) => void;
  fieldNotesError?: string;
};

export function RecommendationSection({
  fieldNotes,
  actionTaken,
  followUpDate,
  suggestions,
  onFieldNotesChange,
  onActionTakenChange,
  onFollowUpChange,
  fieldNotesError
}: Props) {
  const { colors, type } = useDesignSystem();

  return (
    <View style={{ gap: 12 }}>
      {suggestions.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={type.label}>Suggested from past visits</Text>
          <View style={styles.suggestRow}>
            {suggestions.map((line) => (
              <Pressable
                key={line}
                onPress={() => onActionTakenChange(line)}
                style={({ pressed }) => [
                  styles.suggestChip,
                  {
                    backgroundColor: actionTaken === line ? colors.primarySoft : colors.cardMuted,
                    borderColor: actionTaken === line ? colors.primary : colors.borderSubtle,
                    opacity: pressed ? 0.92 : 1
                  }
                ]}
              >
                <Text style={[type.caption, { color: colors.text }]} numberOfLines={2}>
                  {line}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.emptyHint, { backgroundColor: colors.cardMuted, borderColor: colors.borderSubtle }]}>
          <Text style={[type.bodyStrong, { color: colors.text }]}>No past recommendations</Text>
          <Text style={[type.caption, { color: colors.muted, marginTop: 4 }]}>
            Your advice will be suggested on the next visit.
          </Text>
        </View>
      )}

      <AppInput
        label="Observation / field notes"
        required
        value={fieldNotes}
        error={fieldNotesError}
        onChangeText={onFieldNotesChange}
        multiline
        placeholder="What did you observe in the field?"
      />
      <AppInput
        label="Recommendation / action taken"
        value={actionTaken}
        onChangeText={onActionTakenChange}
        multiline
        placeholder="Treatment or recommendation given"
      />
      <DatePickerField
        label="Follow-up date (optional)"
        value={followUpDate}
        onChange={onFollowUpChange}
        minimumDate={new Date()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestChip: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  emptyHint: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12
  }
});
