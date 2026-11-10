import { StyleSheet, Text } from 'react-native';
import { colors, spacing, type } from '../../theme';

/** One line in the warning color, e.g. the Swedish 403 message from readErrorMessage. */
export function ErrorText({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <Text accessibilityRole="alert" style={[type.meta, styles.error]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.warning, paddingHorizontal: spacing.page, paddingVertical: spacing.md },
});
