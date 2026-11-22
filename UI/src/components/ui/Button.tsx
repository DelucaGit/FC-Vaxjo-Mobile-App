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
 * The one button in the app (prototype `.btn`).
 * Primary: red with white text. Secondary: white with a thin border.
 * Danger: soft red with dark red text. Link: only red text.
 * Disabled: the same button, faded (prototype `.b-dis`).
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
        disabled && styles.disabled,
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
      return colors.danger;
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
  disabled: { opacity: 0.4 },
  underline: { textDecorationLine: 'underline' },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: sizes.divider,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.dangerSoft },
  link: { paddingHorizontal: 0, alignItems: 'flex-start' },
};

const pressedStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.muted },
  danger: { opacity: 0.8 },
  link: {},
};
