import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setTrainingCancelled } from '../api/trainings';
import { Button, Screen, TextArea } from '../components/ui';
import { ErrorText } from '../components/activities/TrainingForm';
import type { AppStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CancelTraining'>;

/** "Ställ in träning" (spec section 7). Players and parents see the reason in their schedule. */
export default function CancelTrainingScreen({ navigation, route }: Props) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setSaving(true);
    setError(null);
    try {
      await setTrainingCancelled(route.params.trainingId, true, reason.trim() || null);
      // Back to the detail screen, which reloads on focus and shows "Inställd".
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Ställ in träning"
      onBack={() => navigation.goBack()}
      bottom={
        <Button title="Ställ in träning" style={styles.grow} disabled={saving} onPress={cancel} />
      }
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
