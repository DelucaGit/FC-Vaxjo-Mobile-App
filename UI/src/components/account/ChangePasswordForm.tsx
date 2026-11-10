import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { Button, Field } from '../ui';
import { accountErrorMessage, PASSWORDS_DIFFER_MESSAGE } from '../../lib/account/messages';
import { colors, spacing, type } from '../../theme';

type Props = {
  /** Runs after the API has accepted the new password. */
  onSaved?: () => void;
};

/**
 * The three fields from "Byt lösenord" (spec section 7). Used both by the
 * forced change after the first login and by the one under "Mer".
 * "Spara" stays locked until all three are filled and the two new ones match.
 */
export function ChangePasswordForm({ onSaved }: Props) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only complain once both new fields have text, not while the user is still typing the first.
  const differ = next.length > 0 && confirm.length > 0 && next !== confirm;
  const canSave = current.length > 0 && next.length > 0 && next === confirm && !saving;

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      onSaved?.();
    } catch (err) {
      setError(accountErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <Field
        label="Nuvarande lösenord"
        secureTextEntry
        autoCapitalize="none"
        value={current}
        onChangeText={setCurrent}
      />
      <Field
        label="Nytt lösenord"
        secureTextEntry
        autoCapitalize="none"
        value={next}
        onChangeText={setNext}
      />
      <Field
        label="Bekräfta"
        secureTextEntry
        autoCapitalize="none"
        value={confirm}
        onChangeText={setConfirm}
      />
      {differ ? <Text style={styles.warning}>{PASSWORDS_DIFFER_MESSAGE}</Text> : null}
      {error ? <Text style={styles.warning}>{error}</Text> : null}
      <Button title="Spara" onPress={onSave} disabled={!canSave} block />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  warning: { ...type.body, color: colors.warning },
});
