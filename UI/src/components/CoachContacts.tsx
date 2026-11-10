import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MyCoach, listMyCoaches } from '../api/mySchedule';
import { colors, radius } from '../theme/colors';

type Props = {
  // Parent: the selected child's id. Player: leave it out.
  childId?: number;
};

// "Tränare" section: who coaches the team, and how to reach them.
// It loads its own data, so the schedule screen only has to render it.
type Result = {
  // Which child this answer is for (undefined = the player themself).
  childId?: number;
  coaches: MyCoach[];
  error: string | null;
};

export default function CoachContacts({ childId }: Props) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    // Ignore an old answer if the child changes before it arrives.
    let cancelled = false;
    listMyCoaches(childId)
      .then((coaches) => {
        if (!cancelled) {
          setResult({ childId, coaches, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : '';
          setResult({ childId, coaches: [], error: message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

  // Still loading while we have no answer for the current child.
  const loading = result == null || result.childId !== childId;
  const coaches = loading ? [] : result.coaches;
  const error = loading ? null : result.error;

  return (
    <View>
      <Text style={styles.subheading}>Tränare</Text>
      {error != null ? (
        <Text style={styles.error}>
          {`Kunde inte hämta tränarna. ${error}`.trim()}
        </Text>
      ) : null}
      {loading ? <Text style={styles.hint}>Laddar…</Text> : null}
      {!loading && error == null && coaches.length === 0 ? (
        <Text style={styles.hint}>Inga tränare kopplade till laget än.</Text>
      ) : null}
      {coaches.map((coach) => (
        <View key={coach.id} style={styles.card}>
          <Text style={styles.name}>{coach.name ?? 'Namn saknas'}</Text>
          {coach.mobilePhoneNumber ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(`tel:${coach.mobilePhoneNumber}`)}
            >
              <Text style={styles.link}>Ring {coach.mobilePhoneNumber}</Text>
            </Pressable>
          ) : null}
          {coach.email ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(`mailto:${coach.email}`)}
            >
              <Text style={styles.link}>Mejla {coach.email}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  subheading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  hint: {
    color: colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 20,
  },
  error: {
    color: colors.error,
    marginBottom: 8,
  },
  card: {
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceContainerLowest,
  },
  name: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 6,
  },
});
