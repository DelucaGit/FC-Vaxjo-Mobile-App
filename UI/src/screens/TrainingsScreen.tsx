import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { Team, listMyTeams, listTeams } from '../api/teams';
import {
  AttendanceRow,
  AttendanceStatus,
  Training,
  createTraining,
  listAttendance,
  listTrainings,
  updateAttendance,
} from '../api/trainings';
import { colors, radius, spacing } from '../theme/colors';

/** Build LocalDateTime string for the API: YYYY-MM-DDTHH:mm:00 */
function toApiDateTime(date: string, time: string): string {
  return `${date.trim()}T${time.trim()}:00`;
}

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

function formatSessionHeading(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
    const time = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Närvaro · ${weekday} ${time}`;
  } catch {
    return 'Närvaro';
  }
}

export default function TrainingsScreen() {
  const { session } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  const [title, setTitle] = useState('Träning');
  const [date, setDate] = useState('2026-10-27');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:30');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const presentCount = useMemo(
    () => attendance.filter((row) => row.status === 'PRESENT').length,
    [attendance],
  );
  const markedCount = useMemo(
    () => attendance.filter((row) => row.status != null).length,
    [attendance],
  );

  const loadTeams = useCallback(async () => {
    try {
      // A coach only sees teams they are linked to.
      // A chairman looks after every team, not only teams they coach.
      // GET /api/my/teams allows COACH and ADMIN, so the chairman uses the full list.
      const next =
        session?.roleName === 'COACH' ? await listMyTeams() : await listTeams();
      setTeams(next);
      if (next.length === 1) {
        setSelectedTeam(next[0]);
        try {
          setTrainings(await listTrainings(next[0].id));
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Kunde inte ladda träningarna.',
          );
          setTrainings([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda lagen.');
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [loadTeams]),
  );

  async function onSelectTeam(team: Team) {
    setSelectedTeam(team);
    setSelectedTraining(null);
    setAttendance([]);
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      setTrainings(await listTrainings(team.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda träningarna.');
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  }

  async function onCreateTraining() {
    if (!selectedTeam) {
      setError('Välj ett lag först.');
      return;
    }
    if (!date.trim() || !startTime.trim() || !endTime.trim()) {
      setError('Fyll i datum, starttid och sluttid (ÅÅÅÅ-MM-DD och TT:mm).');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createTraining({
        teamId: selectedTeam.id,
        startsAt: toApiDateTime(date, startTime),
        endsAt: toApiDateTime(date, endTime),
        title: title.trim() || 'Träning',
      });
      setMessage(`Skapade ${created.title} (id ${created.id}).`);
      setTrainings(await listTrainings(selectedTeam.id));
      setSelectedTraining(created);
      setAttendance(await listAttendance(created.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skapa träningen.');
    } finally {
      setLoading(false);
    }
  }

  async function onOpenTraining(training: Training) {
    setSelectedTraining(training);
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      setAttendance(await listAttendance(training.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda närvaron.');
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }

  async function onSetStatus(playerId: number, status: AttendanceStatus) {
    if (!selectedTraining) {
      return;
    }
    setError(null);
    try {
      const updated = await updateAttendance(selectedTraining.id, playerId, status);
      setAttendance((rows) =>
        rows.map((row) =>
          row.playerUserId === playerId ? { ...row, status: updated.status } : row,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte uppdatera närvaron.');
    }
  }

  async function onMarkAllPresent() {
    if (!selectedTraining || attendance.length === 0) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const results = await Promise.all(
        attendance.map((row) =>
          updateAttendance(selectedTraining.id, row.playerUserId, 'PRESENT'),
        ),
      );
      setAttendance(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte markera alla som närvarande.');
    } finally {
      setLoading(false);
    }
  }

  function onConfirmSave() {
    const teamLabel = selectedTeam?.name ?? selectedTraining?.teamName ?? 'laget';
    setToast(`Närvaro sparad för ${teamLabel}!`);
    setTimeout(() => setToast(null), 2600);
  }

  function onBackFromAttendance() {
    setSelectedTraining(null);
    setAttendance([]);
    setToast(null);
  }

  if (selectedTraining) {
    return (
      <View style={styles.pitchRoot}>
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeIcon}>⚽</Text>
              <Text style={styles.bannerBadgeText}>TRÄNINGSLÄGE PLAN</Text>
            </View>
            <Pressable onPress={onBackFromAttendance} hitSlop={8}>
              <Text style={styles.backLink}>Tillbaka</Text>
            </Pressable>
          </View>

          <Text style={styles.sessionTitle}>
            {formatSessionHeading(selectedTraining.startsAt)}
          </Text>
          <Text style={styles.sessionMeta}>
            {selectedTraining.title}
            {selectedTeam ? ` · ${selectedTeam.name}` : ''}
          </Text>

          <View style={styles.tallyCard}>
            <View>
              <Text style={styles.tallyLabel}>REGISTRERADE</Text>
              <View style={styles.tallyRow}>
                <Text style={styles.tallyPresent}>{presentCount}</Text>
                <Text style={styles.tallyOf}>av {attendance.length}</Text>
                <Text style={styles.tallyHint}>på plats</Text>
              </View>
            </View>
            <Pressable
              style={styles.markAllBtn}
              onPress={onMarkAllPresent}
              disabled={loading || attendance.length === 0}
            >
              <Text style={styles.markAllText}>Markera alla</Text>
            </Pressable>
          </View>
        </View>

        {error ? <Text style={[styles.error, styles.gutter]}>{error}</Text> : null}

        <ScrollView
          contentContainerStyle={styles.roster}
          showsVerticalScrollIndicator={false}
        >
          {attendance.length === 0 ? (
            <Text style={styles.hint}>
              Det fanns inga spelare i laget när träningen skapades.
            </Text>
          ) : (
            attendance.map((row) => (
              <View key={row.playerUserId} style={styles.kidCard}>
                <View style={styles.kidLeft}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberBadgeText}>
                      {row.playerNumber ?? '–'}
                    </Text>
                  </View>
                  <View style={styles.kidInfo}>
                    <Text style={styles.kidName} numberOfLines={1}>
                      {row.playerName}
                    </Text>
                    {row.status === 'EXCUSED' ? (
                      <Text style={styles.kidSub}>Ursäktad</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.attBtns}>
                  <Pressable
                    style={[
                      styles.attBtn,
                      row.status === 'PRESENT' ? styles.jaActive : styles.attIdle,
                    ]}
                    onPress={() => onSetStatus(row.playerUserId, 'PRESENT')}
                  >
                    <Text
                      style={[
                        styles.attBtnText,
                        row.status === 'PRESENT'
                          ? styles.attBtnTextOn
                          : styles.attBtnTextIdle,
                      ]}
                    >
                      JA
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.attBtn,
                      row.status === 'ABSENT' ? styles.nejActive : styles.attIdle,
                    ]}
                    onPress={() => onSetStatus(row.playerUserId, 'ABSENT')}
                  >
                    <Text
                      style={[
                        styles.attBtnText,
                        row.status === 'ABSENT'
                          ? styles.attBtnTextOn
                          : styles.attBtnTextIdle,
                      ]}
                    >
                      NEJ
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {attendance.length > 0 ? (
            <View style={styles.excusedSection}>
              <Text style={styles.excusedSectionLabel}>URSÄKTAD (VALFRITT)</Text>
              <View style={styles.rowWrap}>
                {attendance.map((row) => (
                  <Pressable
                    key={`exc-${row.playerUserId}`}
                    style={[
                      styles.excusedChip,
                      row.status === 'EXCUSED' ? styles.excusedChipActive : null,
                    ]}
                    onPress={() => onSetStatus(row.playerUserId, 'EXCUSED')}
                  >
                    <Text
                      style={[
                        styles.excusedChipText,
                        row.status === 'EXCUSED'
                          ? styles.excusedChipTextActive
                          : null,
                      ]}
                    >
                      {row.playerName.split(' ')[0]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.stickyBar}>
          <Pressable style={styles.saveBtn} onPress={onConfirmSave}>
            <Text style={styles.saveBtnText}>
              Spara närvaro ({markedCount} registrerade)
            </Text>
          </Pressable>
        </View>

        {toast ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Träningar</Text>
      <Text style={styles.hint}>
        Välj ett lag och skapa en träning (start och slut). Öppna den sedan för att
        markera närvaro på plan (JA / NEJ).
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.label}>Lag</Text>
      <View style={styles.rowWrap}>
        {teams.map((team) => (
          <Pressable
            key={team.id}
            style={[
              styles.chip,
              selectedTeam?.id === team.id ? styles.chipActive : null,
            ]}
            onPress={() => onSelectTeam(team)}
          >
            <Text
              style={[
                styles.chipText,
                selectedTeam?.id === team.id ? styles.chipTextActive : null,
              ]}
            >
              {team.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedTeam ? (
        <>
          <Text style={styles.subheading}>Ny träning för {selectedTeam.name}</Text>
          <Text style={styles.label}>Titel</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Datum (ÅÅÅÅ-MM-DD)</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} />
          <Text style={styles.label}>Start (TT:mm)</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
          />
          <Text style={styles.label}>Slut (TT:mm)</Text>
          <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} />
          <Pressable
            style={styles.button}
            onPress={onCreateTraining}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Skapa träning</Text>
          </Pressable>

          <Text style={styles.subheading}>Träningar</Text>
          {trainings.length === 0 ? (
            <Text style={styles.hint}>Inga träningar för laget än.</Text>
          ) : (
            trainings.map((training) => (
              <Pressable
                key={training.id}
                style={styles.card}
                onPress={() => onOpenTraining(training)}
              >
                <Text style={styles.cardTitle}>{training.title}</Text>
                <Text style={styles.cardMeta}>
                  {formatWhen(training.startsAt)} → {formatWhen(training.endsAt)}
                </Text>
                <Text style={styles.openPitch}>Öppna närvaro →</Text>
              </Pressable>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.gutter,
    paddingBottom: 40,
    backgroundColor: colors.background,
  },
  pitchRoot: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  gutter: {
    paddingHorizontal: spacing.gutter,
  },
  banner: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bannerBadgeIcon: {
    fontSize: 16,
  },
  bannerBadgeText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  backLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  sessionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  sessionMeta: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  tallyCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tallyLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  tallyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  tallyPresent: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  tallyOf: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  tallyHint: {
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  markAllBtn: {
    height: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  roster: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.sm,
  },
  kidCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  kidLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  numberBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  kidInfo: {
    flex: 1,
    minWidth: 0,
  },
  kidName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.onSurface,
  },
  kidSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  attBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attBtn: {
    height: 48,
    width: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attIdle: {
    backgroundColor: colors.surfaceContainer,
  },
  jaActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  nejActive: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  attBtnText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  attBtnTextOn: {
    color: colors.onPrimary,
  },
  attBtnTextIdle: {
    color: colors.onSurfaceVariant,
  },
  excusedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  excusedSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  excusedChip: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surfaceContainer,
  },
  excusedChipActive: {
    backgroundColor: colors.secondaryContainer,
  },
  excusedChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  excusedChipTextActive: {
    color: colors.onSecondaryContainer,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  saveBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.inverseSurface,
    borderRadius: radius.full,
  },
  toastText: {
    color: colors.inverseOnSurface,
    fontSize: 13,
    fontWeight: '700',
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
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerLowest,
    color: colors.onSurface,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: colors.onPrimary,
    fontWeight: '700',
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
  openPitch: {
    marginTop: 8,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  error: {
    color: colors.error,
    marginBottom: 8,
  },
  message: {
    color: colors.primary,
    marginBottom: 8,
    fontWeight: '600',
  },
});
