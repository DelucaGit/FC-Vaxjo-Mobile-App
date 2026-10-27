import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Team, listTeams } from '../api/teams';
import {
  AttendanceRow,
  AttendanceStatus,
  Training,
  createTraining,
  listAttendance,
  listTrainings,
  updateAttendance,
} from '../api/trainings';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'EXCUSED'];

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

export default function TrainingsScreen() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  const [title, setTitle] = useState('Training');
  const [date, setDate] = useState('2026-10-27');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:30');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    try {
      setTeams(await listTeams());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load teams.');
    }
  }, []);

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
      setError(err instanceof Error ? err.message : 'Could not load trainings.');
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  }

  async function onCreateTraining() {
    if (!selectedTeam) {
      setError('Pick a team first.');
      return;
    }
    if (!date.trim() || !startTime.trim() || !endTime.trim()) {
      setError('Date, start time, and end time are required (YYYY-MM-DD and HH:mm).');
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
        title: title.trim() || 'Training',
      });
      setMessage(`Created ${created.title} (id ${created.id}).`);
      setTrainings(await listTrainings(selectedTeam.id));
      setSelectedTraining(created);
      setAttendance(await listAttendance(created.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create training failed.');
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
      setError(err instanceof Error ? err.message : 'Could not load attendance.');
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
      setError(err instanceof Error ? err.message : 'Could not update attendance.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Trainings</Text>
      <Text style={styles.hint}>
        Pick a team, create a training (start + end), then mark Present / Absent / Excused.
        The player list is frozen when you create the training.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.label}>Team</Text>
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
          <Text style={styles.subheading}>New training for {selectedTeam.name}</Text>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} />
          <Text style={styles.label}>Start (HH:mm)</Text>
          <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} />
          <Text style={styles.label}>End (HH:mm)</Text>
          <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} />
          <Pressable
            style={styles.button}
            onPress={onCreateTraining}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Create training</Text>
          </Pressable>

          <Text style={styles.subheading}>Trainings</Text>
          {trainings.length === 0 ? (
            <Text style={styles.hint}>No trainings yet for this team.</Text>
          ) : (
            trainings.map((training) => (
              <Pressable
                key={training.id}
                style={[
                  styles.card,
                  selectedTraining?.id === training.id ? styles.cardActive : null,
                ]}
                onPress={() => onOpenTraining(training)}
              >
                <Text style={styles.cardTitle}>{training.title}</Text>
                <Text style={styles.cardMeta}>
                  {formatWhen(training.startsAt)} → {formatWhen(training.endsAt)}
                </Text>
              </Pressable>
            ))
          )}
        </>
      ) : null}

      {selectedTraining ? (
        <>
          <Text style={styles.subheading}>
            Attendance — {selectedTraining.title}
          </Text>
          {attendance.length === 0 ? (
            <Text style={styles.hint}>No players were on the team when this was created.</Text>
          ) : (
            attendance.map((row) => (
              <View key={row.playerUserId} style={styles.attendanceRow}>
                <Text style={styles.playerName}>
                  {row.playerName}
                  {row.playerNumber != null ? ` (#${row.playerNumber})` : ''}
                </Text>
                <Text style={styles.statusLabel}>
                  {row.status ?? 'Not marked'}
                </Text>
                <View style={styles.rowWrap}>
                  {STATUSES.map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.statusChip,
                        row.status === status ? styles.statusChipActive : null,
                      ]}
                      onPress={() => onSetStatus(row.playerUserId, status)}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          row.status === status ? styles.statusChipTextActive : null,
                        ]}
                      >
                        {status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#f8f9fa',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1b4332',
    marginTop: 20,
    marginBottom: 8,
  },
  hint: {
    color: '#495057',
    marginBottom: 12,
    lineHeight: 20,
  },
  label: {
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
    color: '#212529',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#1b4332',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
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
    borderColor: '#1b4332',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: '#1b4332',
  },
  chipText: {
    color: '#1b4332',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  card: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  cardActive: {
    borderColor: '#1b4332',
  },
  cardTitle: {
    fontWeight: '700',
    color: '#212529',
  },
  cardMeta: {
    color: '#6c757d',
    marginTop: 4,
    fontSize: 13,
  },
  attendanceRow: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  playerName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#212529',
  },
  statusLabel: {
    color: '#6c757d',
    marginVertical: 6,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: '#adb5bd',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipActive: {
    backgroundColor: '#1b4332',
    borderColor: '#1b4332',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  statusChipTextActive: {
    color: '#fff',
  },
  error: {
    color: '#c1121f',
    marginBottom: 8,
  },
  message: {
    color: '#1b4332',
    marginBottom: 8,
    fontWeight: '600',
  },
});
