import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';
import { Button } from './Button';

type Props = {
  visible: boolean;
  title: string;
  /** Optional line under the title, e.g. "Den går inte att ändra efteråt." */
  message?: string;
  /** Text on the primary button, e.g. "Lås närvaron". */
  confirmLabel: string;
  onConfirm: () => void;
  /** Called by "Avbryt", a tap outside, and the Android back button. */
  onCancel: () => void;
};

/** A dialog that slides up from the bottom (spec section 4). */
export function Confirm({ visible, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable
          testID="confirm-overlay"
          accessibilityLabel="Stäng"
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={type.meta}>{message}</Text> : null}
          <View style={styles.buttons}>
            <Button title={confirmLabel} onPress={onConfirm} block />
            <Button title="Avbryt" variant="secondary" onPress={onCancel} block />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.page,
    paddingBottom: spacing.lg,
    backgroundColor: colors.overlay,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.page,
    borderRadius: radius,
    backgroundColor: colors.surface,
  },
  title: { ...type.body, fontSize: 16, fontFamily: type.rowTitle.fontFamily },
  buttons: { gap: spacing.sm, marginTop: spacing.sm },
});
