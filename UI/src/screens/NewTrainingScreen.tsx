import { useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createTraining } from '../api/trainings';
import { trainingTypeName } from '../api/trainingTypes';
import { useAuth } from '../auth/AuthContext';
import { canSetPastActivityTime } from '../auth/permissions';
import { Button, Screen } from '../components/ui';
import { ErrorText, TrainingForm } from '../components/activities/TrainingForm';
import { NEW_TRAINING_DEFAULTS, toTrainingPayload } from '../components/activities/trainingValues';
import { PAST_START_MESSAGE, isPastStart } from '../lib/activities/startTime';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NewTraining'>;

/** "Ny träning" (spec section 7). The type comes from the button pressed on "Aktiviteter". */
export default function NewTrainingScreen({ navigation, route }: Props) {
  const { teamId, type } = route.params;
  const { session } = useAuth();
  const [values, setValues] = useState(NEW_TRAINING_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payload = toTrainingPayload(values);
  // Issue #115: only ADMIN may start a training in the past.
  const startPassed =
    payload !== null &&
    !canSetPastActivityTime(session?.roleName) &&
    isPastStart(payload.startsAt);

  const save = async () => {
    if (!payload || startPassed) return;
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
        <Button
          title="Spara"
          style={styles.grow}
          disabled={!payload || startPassed || saving}
          onPress={save}
        />
      }
    >
      <ErrorText message={error ?? (startPassed ? PAST_START_MESSAGE : null)} />
      <TrainingForm values={values} onChange={setValues} />
    </Screen>
  );
}

const styles = StyleSheet.create({ grow: { flex: 1 } });
