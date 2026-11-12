import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HomeAway } from '../../api/matches';
import { toKickoffAt } from '../../lib/matches/kickoff';
import { Field, Segmented, type Option } from '../ui';
import { colors, spacing, type } from '../../theme';

/** The fields on "Ny match" and "Ändra match". */
export type MatchFormValues = {
  opponent: string;
  /** "2026-11-21" */
  date: string;
  /** "10:00" */
  time: string;
  venue: string;
  /** null until the coach picks one. */
  homeAway: HomeAway | null;
};

export const NEW_MATCH_DEFAULTS: MatchFormValues = {
  opponent: '',
  date: '',
  time: '10:00',
  venue: '',
  homeAway: null,
};

/** Fills the form from a saved match ("2026-11-21T10:00:00"). */
export function matchValuesFrom(match: {
  opponent: string;
  kickoffAt: string;
  venue: string;
  homeAway: HomeAway;
}): MatchFormValues {
  return {
    opponent: match.opponent,
    date: match.kickoffAt.slice(0, 10),
    time: match.kickoffAt.slice(11, 16),
    venue: match.venue,
    homeAway: match.homeAway,
  };
}

export type MatchPayload = {
  opponent: string;
  kickoffAt: string;
  venue: string;
  homeAway: HomeAway;
};

/** What the API gets, or null while a field is missing or the date/time is not real. */
export function toMatchPayload(values: MatchFormValues): MatchPayload | null {
  const kickoffAt = toKickoffAt(values.date, values.time);
  const opponent = values.opponent.trim();
  const venue = values.venue.trim();
  if (opponent === '' || venue === '' || kickoffAt === null || values.homeAway === null) {
    return null;
  }
  return { opponent, kickoffAt, venue, homeAway: values.homeAway };
}

const HOME_AWAY: readonly Option<HomeAway>[] = [
  { label: 'Hemma', value: 'HOME' },
  { label: 'Borta', value: 'AWAY' },
];

type Props = {
  values: MatchFormValues;
  onChange: (values: MatchFormValues) => void;
  /** Shown under the fields, e.g. error messages. */
  children?: ReactNode;
};

/** The fields shared by "Ny match" and "Ändra match". "Spara" lives in the screen. */
export function MatchForm({ values, onChange, children }: Props) {
  const set = (key: 'opponent' | 'date' | 'time' | 'venue') => (text: string) =>
    onChange({ ...values, [key]: text });

  return (
    <View style={styles.form}>
      <Field label="Motståndare" value={values.opponent} onChangeText={set('opponent')} />
      <Field
        label="Datum"
        value={values.date}
        onChangeText={set('date')}
        placeholder="ÅÅÅÅ-MM-DD"
        keyboardType="numbers-and-punctuation"
      />
      <Field
        label="Avspark"
        value={values.time}
        onChangeText={set('time')}
        placeholder="TT:MM"
        keyboardType="numbers-and-punctuation"
      />
      <Field label="Plats" value={values.venue} onChangeText={set('venue')} />
      <View style={styles.field}>
        <Text style={styles.label}>Hemma/Borta</Text>
        <Segmented
          accessibilityLabel="Hemma/Borta"
          options={HOME_AWAY}
          value={values.homeAway}
          onChange={(homeAway) => onChange({ ...values, homeAway })}
        />
      </View>
      {children}
    </View>
  );
}

/** An error under the match form, in the warning color. */
export function MatchFormError({ message }: { message: string | null }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

const styles = StyleSheet.create({
  form: { padding: spacing.page, gap: spacing.md },
  // Same look as the label inside Field.
  field: { gap: spacing.xs },
  label: { ...type.meta, color: colors.text },
  error: { ...type.body, color: colors.warning },
});
