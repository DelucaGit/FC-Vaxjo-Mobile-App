import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { colors, radius, sizes, spacing, type } from '../../theme';

type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
};

/** Label above a 48 px input. The border turns red-brand while the field has focus. */
export function Field({ label, onFocus, onBlur, multiline, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, multiline && styles.multiline, focused && styles.focused]}
      />
    </View>
  );
}

/** Same as Field, but several lines high. */
export function TextArea(props: Omit<FieldProps, 'multiline'>) {
  return <Field {...props} multiline />;
}

export type Option<T extends string | number> = { label: string; value: T };

type SelectFieldProps<T extends string | number> = {
  label: string;
  value: T | null;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * A field that opens a list from the bottom of the screen (a "dropdown").
 * React Native has no built-in select, so this uses a Modal.
 */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Välj',
  disabled = false,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.input, styles.select, open && styles.focused]}
      >
        <Text style={[type.input, styles.grow, !selected && styles.placeholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={20} color={colors.textMuted} strokeWidth={1.5} />
      </Pressable>

      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={[type.sectionLabel, styles.sheetTitle]}>{label}</Text>
          <ScrollView>
            {options.map((option) => (
              <Pressable
                key={String(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: option.value === value }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Text style={[type.body, styles.grow]}>{option.label}</Text>
                {option.value === value ? (
                  <Check size={20} color={colors.primary} strokeWidth={2} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { ...type.meta, color: colors.text },
  input: {
    ...type.input,
    minHeight: sizes.touch,
    borderWidth: sizes.divider,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 96, paddingVertical: spacing.md },
  // Focus: primary border plus a ring. The ring is a wider border, not a shadow.
  focused: { borderColor: colors.primary, borderWidth: 2, paddingHorizontal: spacing.md - 1 },
  select: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  placeholder: { color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    paddingBottom: spacing.lg,
  },
  sheetTitle: { padding: spacing.page },
  option: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    borderTopWidth: sizes.divider,
    borderTopColor: colors.border,
  },
  optionPressed: { backgroundColor: colors.muted },
});
