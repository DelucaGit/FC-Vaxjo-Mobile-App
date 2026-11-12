import { useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createMatch } from '../api/matches';
import { useAuth } from '../auth/AuthContext';
import { canSetPastActivityTime } from '../auth/permissions';
import { Button, Screen } from '../components/ui';
import {
  MatchForm,
  MatchFormError,
  NEW_MATCH_DEFAULTS,
  toMatchPayload,
  type MatchFormValues,
} from '../components/activities/MatchForm';
import { PAST_START_MESSAGE, isPastStart } from '../lib/activities/startTime';
import { toKickoffAt } from '../lib/matches/kickoff';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'NewMatch'>;

/** Ny match (spec section 7). Every field is required; the result is set later. */
export default function NewMatchScreen({ navigation, route }: Props) {
  const { teamId } = route.params;
  const { session } = useAuth();
  const [values, setValues] = useState<MatchFormValues>(NEW_MATCH_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = toMatchPayload(values);
  // Issue #115: only ADMIN may set a kick-off that has already passed.
  // Checked on its own, so the warning shows before the other fields are filled in.
  const kickoffAt = toKickoffAt(values.date, values.time);
  const kickoffPassed =
    kickoffAt !== null && !canSetPastActivityTime(session?.roleName) && isPastStart(kickoffAt);
  const canSave = payload !== null && !kickoffPassed;

  async function save() {
    if (!canSave || payload === null) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createMatch({ teamId, ...payload });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara matchen.');
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Ny match"
      onBack={() => navigation.goBack()}
      bottom={
        <Button title="Spara" block style={styles.grow} disabled={!canSave || saving} onPress={save} />
      }
    >
      <MatchForm values={values} onChange={setValues}>
        <MatchFormError message={kickoffPassed ? PAST_START_MESSAGE : null} />
        <MatchFormError message={error} />
      </MatchForm>
    </Screen>
  );
}

const styles = StyleSheet.create({ grow: { flex: 1 } });
