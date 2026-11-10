import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import {
  MyChild,
  MyTraining,
  listMyChildren,
  listMyTrainings,
} from '../api/mySchedule';
import CoachContacts from '../components/CoachContacts';
import { colors, radius, spacing } from '../theme/colors';

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function statusLabel(status: MyTraining['status']): string {
  if (status == null) {
    return 'Not marked yet';
  }
  return status;
}

export default function MyScheduleScreen() {
  const { session } = useAuth();
  const isParent = session?.roleName === 'PARENT';

  const [children, setChildren] = useState<MyChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<MyChild | null>(null);
  const [trainings, setTrainings] = useState<MyTraining[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        setError(null);
        try {
          if (isParent) {
            const kids = await listMyChildren();
            if (cancelled) {
              return;
            }
            setChildren(kids);
            const first = kids[0] ?? null;
            setSelectedChild(first);
            if (first) {
              setTrainings(await listMyTrainings(first.id));
            } else {
              setTrainings([]);
            }
          } else {
            setTrainings(await listMyTrainings());
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load schedule.');
            setTrainings([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      load();
      return () => {
        cancelled = true;
      };
    }, [isParent]),
  );

  async function onSelectChild(child: MyChild) {
    setSelectedChild(child);
    setLoading(true);
    setError(null);
    try {
      setTrainings(await listMyTrainings(child.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load schedule.');
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>My schedule</Text>
      <Text style={styles.hint}>
        {isParent
          ? 'Pick a child to see their team trainings and attendance status. Only coaches mark attendance.'
          : 'Trainings for your team and your attendance status. Only coaches mark attendance.'}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text style={styles.hint}>Loading…</Text> : null}

      {isParent ? (
        <>
          <Text style={styles.label}>Child</Text>
          {children.length === 0 ? (
            <Text style={styles.hint}>No linked players yet.</Text>
          ) : (
            <View style={styles.rowWrap}>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  style={[
                    styles.chip,
                    selectedChild?.id === child.id ? styles.chipActive : null,
                  ]}
                  onPress={() => onSelectChild(child)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedChild?.id === child.id
                        ? styles.chipTextActive
                        : null,
                    ]}
                  >
                    {child.name}
                    {child.teamName ? ` (${child.teamName})` : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}

      <Text style={styles.subheading}>Trainings</Text>
      {trainings.length === 0 && !loading ? (
        <Text style={styles.hint}>No trainings to show.</Text>
      ) : (
        trainings.map((training) => (
          <View key={training.id} style={styles.card}>
            <Text style={styles.cardTitle}>{training.title}</Text>
            <Text style={styles.cardMeta}>
              {training.teamName} · {formatWhen(training.startsAt)} →{' '}
              {formatWhen(training.endsAt)}
            </Text>
            {isParent ? (
              <Text style={styles.cardMeta}>Player: {training.playerName}</Text>
            ) : null}
            <Text style={styles.status}>{statusLabel(training.status)}</Text>
          </View>
        ))
      )}

      {isParent ? (
        selectedChild ? <CoachContacts childId={selectedChild.id} /> : null
      ) : (
        <CoachContacts />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.gutter,
    paddingBottom: 40,
    backgroundColor: colors.background,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
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
  label: {
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
    color: colors.onSurface,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.primary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  card: {
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  cardMeta: {
    color: colors.onSurfaceVariant,
    marginTop: 4,
    fontSize: 13,
  },
  status: {
    marginTop: 8,
    fontWeight: '600',
    color: colors.primary,
  },
  error: {
    color: colors.error,
    marginBottom: 8,
  },
});
