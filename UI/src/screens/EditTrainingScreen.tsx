import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTraining, updateTraining } from '../api/trainings';
import { trainingTypeName, type TrainingType } from '../api/trainingTypes';
import { Button, Screen } from '../components/ui';
import { ErrorText, TrainingForm } from '../components/activities/TrainingForm';
import {
  formValuesFrom,
  toTrainingPayload,
  type TrainingFormValues,
} from '../components/activities/trainingValues';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'EditTraining'>;

/** "Redigera träning" (spec section 7): the same fields as "Ny träning", filled in. */
export default function EditTrainingScreen({ navigation, route }: Props) {
  const { trainingId } = route.params;
  const [values, setValues] = useState<TrainingFormValues | null>(null);
  // Not editable: kept from the saved training and sent back on PUT.
  const [trainingType, setTrainingType] = useState<TrainingType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getTraining(trainingId)
      .then((training) => {
        if (!active) return;
        setTrainingType(training.type);
        setValues(formValuesFrom(training));
      })
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [trainingId]);

  const payload = values ? toTrainingPayload(values) : null;

  const save = async () => {
    if (!payload || !trainingType) return;
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
        <Button title="Spara" style={styles.grow} disabled={!payload || saving} onPress={save} />
      }
    >
      <ErrorText message={error} />
      {values ? <TrainingForm values={values} onChange={setValues} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ grow: { flex: 1 } });
