import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, sizes, type } from '../../theme';
import type { Option } from './Field';

type Props<T extends string | number> = {
  options: readonly Option<T>[];
  /** null means nothing is chosen yet (e.g. an unmarked player). */
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Read out by screen readers for the whole group. */
  accessibilityLabel?: string;
};

/**
 * A row of radio buttons on a muted background (spec section 4).
 * The chosen one is red with light text.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.group}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            disabled={disabled}
            onPress={() => {
              if (!active) {
                onChange(option.value);
              }
            }}
            style={[styles.segment, active && styles.active]}
          >
            <Text numberOfLines={1} style={[type.button, active ? styles.activeText : styles.text]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    padding: 2,
    gap: 2,
    backgroundColor: colors.muted,
    borderRadius: radius,
  },
  segment: {
    flex: 1,
    minHeight: sizes.segment,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: radius - 2,
  },
  active: { backgroundColor: colors.primary },
  text: { color: colors.text },
  activeText: { color: colors.onPrimary },
});
