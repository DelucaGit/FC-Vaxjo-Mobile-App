import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Screen, TextArea } from '../ui';
import { ErrorText } from './TrainingForm';
import { spacing } from '../../theme';

type Props = {
  /** "Ställ in träning" or "Ställ in match": the screen title and the button text. */
  title: string;
  /** Calls the API. The reason is null when the field is left empty. */
  cancel: (reason: string | null) => Promise<unknown>;
  onBack: () => void;
};

/**
 * Shared by "Ställ in träning" and "Ställ in match" (spec section 7).
 * An optional reason, and a button that is the confirmation step.
 * Players and parents see the reason in their schedule.
 */
export default function CancelActivityForm({ title, cancel, onBack }: Props) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await cancel(reason.trim() || null);
      // Back to the detail screen, which reloads on focus and shows "Inställd".
      onBack();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Screen
      title={title}
      onBack={onBack}
      bottom={<Button title={title} style={styles.grow} disabled={saving} onPress={submit} />}
    >
      <ErrorText message={error} />
      <View style={styles.form}>
        <TextArea label="Anledning (valfritt)" value={reason} onChangeText={setReason} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  form: { padding: spacing.page },
});
