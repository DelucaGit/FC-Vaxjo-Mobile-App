import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTraining, updateTraining } from '../api/trainings';
import { trainingTypeName, type TrainingType } from '../api/trainingTypes';
import { useAuth } from '../auth/AuthContext';
import { canSetPastActivityTime } from '../auth/permissions';
import { Button, Screen } from '../components/ui';
import { ErrorText, TrainingForm } from '../components/activities/TrainingForm';
import {
  formValuesFrom,
  toTrainingPayload,
  type TrainingFormValues,
} from '../components/activities/trainingValues';
import { PAST_START_MESSAGE, isPastStart } from '../lib/activities/startTime';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'EditTraining'>;

/** "Redigera träning" (spec section 7): the same fields as "Ny träning", filled in. */
export default function EditTrainingScreen({ navigation, route }: Props) {
  const { trainingId } = route.params;
  const { session } = useAuth();
  const [values, setValues] = useState<TrainingFormValues | null>(null);
  // Not editable: kept from the saved training and sent back on PUT.
  const [trainingType, setTrainingType] = useState<TrainingType | null>(null);
  // The start time as saved, so an old training can still get a new place.
  const [savedStart, setSavedStart] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getTraining(trainingId)
      .then((training) => {
        if (!active) return;
        setTrainingType(training.type);
        setValues(formValuesFrom(training));
        setSavedStart(training.startsAt);
      })
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [trainingId]);

  const payload = values ? toTrainingPayload(values) : null;
  // Issue #115: a new start time may not have passed, except for ADMIN.
  // An unchanged start is fine, same as the API. Compare to the minute ("2026-11-12T17:30"),
  // so "17:30" and "17:30:00" count as the same time.
  const startPassed =
    payload !== null &&
    payload.startsAt.slice(0, 16) !== savedStart?.slice(0, 16) &&
    !canSetPastActivityTime(session?.roleName) &&
    isPastStart(payload.startsAt);

  const save = async () => {
    if (!payload || !trainingType || startPassed) return;
    setSaving(true);
    setError(null);
    try {
      await updateTraining(trainingId, { type: trainingType, ...payload });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Screen
      title={trainingType ? `Redigera ${trainingTypeName(trainingType).toLowerCase()}` : 'Redigera träning'}
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
      {values ? <TrainingForm values={values} onChange={setValues} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ grow: { flex: 1 } });
