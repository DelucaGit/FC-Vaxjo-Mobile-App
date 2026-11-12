import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createTraining, createTrainingSeries, type CreateTrainingSeriesInput } from '../api/trainings';
import { trainingTypeName } from '../api/trainingTypes';
import { useAuth } from '../auth/AuthContext';
import { canSetPastActivityTime } from '../auth/permissions';
import { Button, Screen } from '../components/ui';
import { REPEAT_OFF, RepeatWeekly, type RepeatValues } from '../components/activities/RepeatWeekly';
import { ErrorText, TrainingForm } from '../components/activities/TrainingForm';
import {
  NEW_TRAINING_DEFAULTS,
  isValidDate,
  toTrainingPayload,
  type TrainingFormValues,
} from '../components/activities/trainingValues';
import { PAST_START_MESSAGE, isPastStart } from '../lib/activities/startTime';
import {
  MAX_SERIES_TRAININGS,
  NONE_CREATED_MESSAGE,
  TOO_MANY_MESSAGE,
  countSeriesTrainings,
  seriesCountText,
} from '../lib/activities/trainingSeries';
import type { AppStackParamList } from '../navigation/types';
import { spacing, type as text } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewTraining'>;

/** The series body, or null while the repeat part is not filled in (issue #132). */
function toSeriesInput(
  teamId: number,
  type: CreateTrainingSeriesInput['type'],
  values: TrainingFormValues,
  repeat: RepeatValues,
): CreateTrainingSeriesInput | null {
  const payload = toTrainingPayload(values);
  if (!payload || !isValidDate(repeat.endDate) || repeat.weekdays.length === 0) {
    return null;
  }
  return {
    teamId,
    type,
    weekdays: repeat.weekdays,
    startTime: payload.startsAt.slice(11, 16),
    endTime: payload.endsAt.slice(11, 16),
    venue: payload.venue,
    fromDate: values.date.trim(),
    toDate: repeat.endDate.trim(),
  };
}

/** "Ny träning" (spec section 7). The type comes from the button pressed on "Aktiviteter". */
export default function NewTrainingScreen({ navigation, route }: Props) {
  const { teamId, type } = route.params;
  const { session } = useAuth();
  const [values, setValues] = useState(NEW_TRAINING_DEFAULTS);
  const [repeat, setRepeat] = useState<RepeatValues>(REPEAT_OFF);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payload = toTrainingPayload(values);
  // Issue #115: only ADMIN may start a training in the past.
  const startPassed =
    payload !== null &&
    !canSetPastActivityTime(session?.roleName) &&
    isPastStart(payload.startsAt);

  // "Upprepa varje vecka": the API skips dates that have passed, so no past-time lock here.
  const series = repeat.on ? toSeriesInput(teamId, type, values, repeat) : null;
  const seriesCount = series ? countSeriesTrainings(series) : 0;
  const tooMany = seriesCount > MAX_SERIES_TRAININGS;
  const canSave = repeat.on
    ? series !== null && seriesCount > 0 && !tooMany
    : payload !== null && !startPassed;
  const warning = repeat.on
    ? tooMany
      ? TOO_MANY_MESSAGE
      : null
    : startPassed
      ? PAST_START_MESSAGE
      : null;

  const saveSeries = async (input: CreateTrainingSeriesInput) => {
    setSaving(true);
    setError(null);
    try {
      const created = await createTrainingSeries(input);
      if (created.length === 0) {
        // The phone's clock let it through, but the API found only passed dates.
        setError(NONE_CREATED_MESSAGE);
        setSaving(false);
        return;
      }
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const save = async () => {
    if (!canSave) return;
    if (series) {
      await saveSeries(series);
      return;
    }
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
        <Button
          title="Spara"
          style={styles.grow}
          disabled={!canSave || saving}
          onPress={save}
        />
      }
    >
      <ErrorText message={error ?? warning} />
      <TrainingForm
        values={values}
        onChange={setValues}
        dateLabel={repeat.on ? 'Startdatum' : 'Datum'}
      />
      <RepeatWeekly values={repeat} onChange={setRepeat} />
      {series && !tooMany && (
        <Text style={[text.body, styles.count]}>{seriesCountText(seriesCount)}</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  count: { padding: spacing.page },
});
