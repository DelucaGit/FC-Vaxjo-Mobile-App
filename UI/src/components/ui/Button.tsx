import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, sizes, spacing, type } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Full width. */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The one button in the app (spec section 4).
 * Primary: red with light text. Secondary: white with a border.
 * Danger: white with a border and red text. Link: only red text.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  block = false,
  style,
  testID,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && pressedStyles[variant],
        disabled && variant !== 'link' && styles.disabled,
        block && styles.block,
        style,
      ]}
    >
      {({ pressed }) => (
        <Text
          style={[
            type.button,
            { color: textColor(variant) },
            variant === 'link' && pressed && styles.underline,
            disabled && styles.disabledText,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

function textColor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return colors.onPrimary;
    case 'secondary':
      return colors.text;
    case 'danger':
    case 'link':
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.touch,
    borderRadius: radius,
    paddingHorizontal: spacing.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { alignSelf: 'stretch' },
  disabled: { backgroundColor: colors.border, borderColor: colors.border },
  disabledText: { color: colors.textMuted },
  underline: { textDecorationLine: 'underline' },
});

const bordered: ViewStyle = {
  backgroundColor: colors.surface,
  borderWidth: sizes.divider,
  borderColor: colors.border,
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: bordered,
  danger: bordered,
  link: { paddingHorizontal: 0, alignItems: 'flex-start' },
};

const pressedStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.muted },
  danger: { backgroundColor: colors.muted },
  link: {},
};
