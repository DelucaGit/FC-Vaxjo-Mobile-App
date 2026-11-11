import { useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createTraining } from '../api/trainings';
import { trainingTypeName } from '../api/trainingTypes';
import { Button, Screen } from '../components/ui';
import { ErrorText, TrainingForm } from '../components/activities/TrainingForm';
import { NEW_TRAINING_DEFAULTS, toTrainingPayload } from '../components/activities/trainingValues';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NewTraining'>;

/** "Ny träning" (spec section 7). The type comes from the button pressed on "Aktiviteter". */
export default function NewTrainingScreen({ navigation, route }: Props) {
  const { teamId, type } = route.params;
  const [values, setValues] = useState(NEW_TRAINING_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payload = toTrainingPayload(values);

  const save = async () => {
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
      await createTraining({ teamId, type, ...payload });
      // Back to "Aktiviteter", which reloads on focus and shows the new training.
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Screen
      title={trainingTypeName(type)}
      onBack={() => navigation.goBack()}
      bottom={
        <Button title="Spara" style={styles.grow} disabled={!payload || saving} onPress={save} />
      }
    >
      <ErrorText message={error} />
      <TrainingForm values={values} onChange={setValues} />
    </Screen>
  );
}

const styles = StyleSheet.create({ grow: { flex: 1 } });
