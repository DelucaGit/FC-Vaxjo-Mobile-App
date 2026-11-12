import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getMatch, setMatchResult, type Match } from '../api/matches';
import { Button, Field, Screen, SkeletonList } from '../components/ui';
import { toGoals } from '../lib/matches/kickoff';
import type { AppStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'SetResult'>;

/**
 * Ange resultat (spec section 7). Our goals on the left, the opponent's on the right.
 * The backend clears a result when both numbers are null, so a saved result can be removed.
 */
export default function SetResultScreen({ navigation, route }: Props) {
  const { matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const [goalsFor, setGoalsFor] = useState('');
  const [goalsAgainst, setGoalsAgainst] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMatch(matchId)
      .then((loaded) => {
        if (!active) return;
        setMatch(loaded);
        if (loaded.result) {
          setGoalsFor(String(loaded.result.goalsFor));
          setGoalsAgainst(String(loaded.result.goalsAgainst));
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Kunde inte hämta matchen.');
      });
    return () => {
      active = false;
    };
  }, [matchId]);

  const ours = toGoals(goalsFor);
  const theirs = toGoals(goalsAgainst);
  const canSave = match !== null && ours !== null && theirs !== null && !saving;

  async function send(forValue: number | null, againstValue: number | null) {
    setSaving(true);
    setError(null);
    try {
      await setMatchResult(matchId, forValue, againstValue);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara resultatet.');
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Ange resultat"
      onBack={() => navigation.goBack()}
      bottom={
        <>
          {match?.result ? (
            <Button
              title="Ta bort resultat"
              variant="danger"
              style={styles.grow}
              disabled={saving}
              onPress={() => send(null, null)}
            />
          ) : null}
          <Button
            title="Spara"
            style={styles.grow}
            disabled={!canSave}
            onPress={() => send(ours, theirs)}
          />
        </>
      }
    >
      {!match && !error ? <SkeletonList rows={2} /> : null}
      <View style={styles.form}>
        {match ? (
          <View style={styles.scoreRow}>
            <View style={styles.grow}>
              <Field
                label={match.teamName}
                value={goalsFor}
                onChangeText={setGoalsFor}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <Text style={styles.dash}>–</Text>
            <View style={styles.grow}>
              <Field
                label={match.opponent}
                value={goalsAgainst}
                onChangeText={setGoalsAgainst}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.page, gap: spacing.md },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  grow: { flex: 1 },
  // Lifted so it sits in the middle of the 48 px inputs, not of the labels.
  dash: { ...type.heading, lineHeight: 48 },
  error: { ...type.body, color: colors.warning },
});
