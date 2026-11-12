import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getMatch, updateMatch } from '../api/matches';
import { useAuth } from '../auth/AuthContext';
import { canSetPastActivityTime } from '../auth/permissions';
import { Button, Screen, useToast } from '../components/ui';
import {
  MatchForm,
  MatchFormError,
  matchValuesFrom,
  toMatchPayload,
  type MatchFormValues,
} from '../components/activities/MatchForm';
import { ErrorText } from '../components/activities/TrainingForm';
import { PAST_START_MESSAGE, isPastStart } from '../lib/activities/startTime';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'EditMatch'>;

/** "Ändra match" (issue #130): the same fields as "Ny match", filled in. */
export default function EditMatchScreen({ navigation, route }: Props) {
  const toast = useToast();
  const { matchId } = route.params;
  const { session } = useAuth();
  const [values, setValues] = useState<MatchFormValues | null>(null);
  // The kick-off as saved, so an old match can still get a new place.
  const [savedKickoff, setSavedKickoff] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMatch(matchId)
      .then((match) => {
        if (!active) return;
        setValues(matchValuesFrom(match));
        setSavedKickoff(match.kickoffAt);
      })
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [matchId]);

  const payload = values ? toMatchPayload(values) : null;
  // Issue #115: a new kick-off may not have passed, except for ADMIN.
  // An unchanged kick-off is fine, same as the API. Compared to the minute.
  const kickoffPassed =
    payload !== null &&
    payload.kickoffAt.slice(0, 16) !== savedKickoff?.slice(0, 16) &&
    !canSetPastActivityTime(session?.roleName) &&
    isPastStart(payload.kickoffAt);

  const save = async () => {
    if (!payload || kickoffPassed) return;
    setSaving(true);
    setError(null);
    try {
      await updateMatch(matchId, payload);
      toast.show('Matchen är sparad');
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara matchen.');
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Ändra match"
      onBack={() => navigation.goBack()}
      bottom={
        <Button
          title="Spara"
          block
          style={styles.grow}
          disabled={!payload || kickoffPassed || saving}
          onPress={save}
        />
      }
    >
      {values ? (
        <MatchForm values={values} onChange={setValues}>
          <MatchFormError message={kickoffPassed ? PAST_START_MESSAGE : null} />
          <MatchFormError message={error} />
        </MatchForm>
      ) : (
        // Loading failed before the form exists.
        <ErrorText message={error} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ grow: { flex: 1 } });
