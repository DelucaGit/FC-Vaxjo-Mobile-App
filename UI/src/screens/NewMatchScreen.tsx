import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createMatch, type HomeAway } from '../api/matches';
import { Button, Field, Screen, Segmented, type Option } from '../components/ui';
import { toKickoffAt } from '../lib/matches/kickoff';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewMatch'>;

const HOME_AWAY: readonly Option<HomeAway>[] = [
  { label: 'Hemma', value: 'HOME' },
  { label: 'Borta', value: 'AWAY' },
];

/** Ny match (spec section 7). Every field is required; the result is set later. */
export default function NewMatchScreen({ navigation, route }: Props) {
  const { teamId } = route.params;
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [venue, setVenue] = useState('');
  const [homeAway, setHomeAway] = useState<HomeAway | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kickoffAt = toKickoffAt(date, time);
  const canSave =
    opponent.trim() !== '' && venue.trim() !== '' && kickoffAt !== null && homeAway !== null;

  async function save() {
    if (!canSave || kickoffAt === null || homeAway === null) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createMatch({
        teamId,
        opponent: opponent.trim(),
        kickoffAt,
        venue: venue.trim(),
        homeAway,
      });
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
      <View style={styles.form}>
        <Field label="Motståndare" value={opponent} onChangeText={setOpponent} />
        <Field
          label="Datum"
          value={date}
          onChangeText={setDate}
          placeholder="ÅÅÅÅ-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Avspark"
          value={time}
          onChangeText={setTime}
          placeholder="TT:MM"
          keyboardType="numbers-and-punctuation"
        />
        <Field label="Plats" value={venue} onChangeText={setVenue} />
        <View style={styles.field}>
          <Text style={styles.label}>Hemma/Borta</Text>
          <Segmented
            accessibilityLabel="Hemma/Borta"
            options={HOME_AWAY}
            value={homeAway}
            onChange={setHomeAway}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.page, gap: spacing.md },
  grow: { flex: 1 },
  // Same look as the label inside Field.
  field: { gap: spacing.xs },
  label: { ...type.meta, color: colors.text },
  error: { ...type.body, color: colors.warning },
});
