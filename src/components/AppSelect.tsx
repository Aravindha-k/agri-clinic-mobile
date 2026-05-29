import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import { space } from "../theme/layout";

export type SelectOption = {
  label: string;
  value: string;
  helper?: string;
};

type Props = {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  onLayout?: (event: { nativeEvent: { layout: { y: number } } }) => void;
};

export function AppSelect({ label, value, options, placeholder = "Select", onChange, required, error, onLayout }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const hasError = Boolean(error);

  const labelText = required ? `${label} *` : label;

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <Text style={[styles.label, { color: hasError ? c.danger : c.muted }]}>{labelText}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.control,
          {
            backgroundColor: c.card,
            borderColor: hasError ? c.danger : open ? c.primary : c.border,
            borderWidth: hasError || open ? 1.5 : 1
          },
          pressed && styles.controlPressed
        ]}
      >
        <View style={styles.controlBody}>
          <Text style={[styles.controlValue, { color: selected ? c.text : c.muted }]} numberOfLines={1}>
            {selected?.label || placeholder}
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={22} color={c.primaryDark} />
      </Pressable>
      {open ? (
        <View style={[styles.menu, { backgroundColor: c.card, borderColor: c.border }]}>
          {options.length === 0 ? (
            <Text style={[styles.empty, { color: c.muted }]}>No options available</Text>
          ) : (
            options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={[
                  styles.option,
                  { borderBottomColor: c.border },
                  option.value === value && { backgroundColor: c.primarySoft }
                ]}
              >
                <Text style={[styles.optionText, { color: c.text }]}>{option.label}</Text>
                {option.helper ? <Text style={[styles.helper, { color: c.muted }]}>{option.helper}</Text> : null}
              </Pressable>
            ))
          )}
        </View>
      ) : null}
      {error ? <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: space.xs
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  errorText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  control: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2
  },
  controlPressed: {
    opacity: 0.92
  },
  controlBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: space.sm
  },
  controlValue: {
    fontSize: 16,
    fontWeight: "700"
  },
  menu: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: space.xs,
    overflow: "hidden"
  },
  option: {
    borderBottomWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.md
  },
  optionText: {
    fontSize: 15,
    fontWeight: "700"
  },
  helper: {
    fontSize: 12,
    marginTop: 2
  },
  empty: {
    padding: space.md
  }
});
