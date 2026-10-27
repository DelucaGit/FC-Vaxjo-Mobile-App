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
import {
  Team,
  addTeamCoach,
  createTeam,
  listTeamCoaches,
  listTeams,
  removeTeamCoach,
} from '../api/teams';
import { ClubUser, searchByName } from '../api/users';

export default function TeamsScreen() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [coaches, setCoaches] = useState<ClubUser[]>([]);
  const [coachSearch, setCoachSearch] = useState('');
  const [coachMatches, setCoachMatches] = useState<ClubUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    try {
      const data = await listTeams();
      setTeams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load teams.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [loadTeams]),
  );

  async function onCreateTeam() {
    const trimmed = newTeamName.trim();
    if (!trimmed) {
      setError('Team name is required (e.g. P15).');
      setMessage(null);
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const team = await createTeam(trimmed);
      setMessage(`Created team ${team.name} (id ${team.id}).`);
      setNewTeamName('');
      await loadTeams();
      setSelectedTeam(team);
      setCoaches([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create team failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onSelectTeam(team: Team) {
    setSelectedTeam(team);
    setError(null);
    setMessage(null);
    setCoachSearch('');
    setCoachMatches([]);
    try {
      setCoaches(await listTeamCoaches(team.id));
    } catch (err) {
      setCoaches([]);
      setError(err instanceof Error ? err.message : 'Could not load coaches.');
    }
  }

  async function onSearchCoaches(text: string) {
    setCoachSearch(text);
    const trimmed = text.trim();
    if (trimmed.length < 1) {
      setCoachMatches([]);
      return;
    }
    try {
      const users = await searchByName(trimmed);
      setCoachMatches(users.filter((user) => user.roleName === 'COACH'));
    } catch {
      setCoachMatches([]);
    }
  }

  async function onAddCoach(coach: ClubUser) {
    if (!selectedTeam) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await addTeamCoach(selectedTeam.id, coach.id);
      setMessage(`Added ${coach.name} to ${selectedTeam.name}.`);
      setCoachSearch('');
      setCoachMatches([]);
      setCoaches(await listTeamCoaches(selectedTeam.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add coach failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onRemoveCoach(coach: ClubUser) {
    if (!selectedTeam) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await removeTeamCoach(selectedTeam.id, coach.id);
      setMessage(`Removed ${coach.name} from ${selectedTeam.name}.`);
      setCoaches(await listTeamCoaches(selectedTeam.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove coach failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Teams</Text>
      <Text style={styles.hint}>Create a team (e.g. P15), then assign coaches.</Text>

      <Text style={styles.label}>New team name</Text>
      <TextInput
        style={styles.input}
        value={newTeamName}
        onChangeText={setNewTeamName}
        placeholder="P15"
        autoCapitalize="characters"
      />
      <Pressable style={styles.button} onPress={onCreateTeam} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Create team'}</Text>
      </Pressable>

      <Text style={[styles.label, styles.sectionGap]}>All teams</Text>
      {teams.length === 0 ? <Text style={styles.hint}>No teams yet.</Text> : null}
      {teams.map((team) => (
        <Pressable
          key={team.id}
          style={[
            styles.teamRow,
            selectedTeam?.id === team.id ? styles.teamRowActive : null,
          ]}
          onPress={() => onSelectTeam(team)}
        >
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.matchMeta}>id {team.id}</Text>
        </Pressable>
      ))}

      {selectedTeam ? (
        <View style={styles.parentBox}>
          <Text style={styles.parentTitle}>Coaches on {selectedTeam.name}</Text>

          {coaches.length === 0 ? (
            <Text style={styles.hint}>No coaches on this team yet.</Text>
          ) : null}
          {coaches.map((coach) => (
            <View key={coach.id} style={styles.coachRow}>
              <View style={styles.coachInfo}>
                <Text style={styles.matchName}>{coach.name}</Text>
                <Text style={styles.matchMeta}>{coach.email}</Text>
              </View>
              <Pressable onPress={() => onRemoveCoach(coach)}>
                <Text style={styles.clearLink}>Remove</Text>
              </Pressable>
            </View>
          ))}

          <Text style={styles.label}>Add coach by name</Text>
          <TextInput
            style={styles.input}
            value={coachSearch}
            onChangeText={onSearchCoaches}
            placeholder="Search COACH users"
          />
          {coachMatches.map((coach) => (
            <Pressable
              key={coach.id}
              style={styles.matchRow}
              onPress={() => onAddCoach(coach)}
            >
              <Text style={styles.matchName}>{coach.name}</Text>
              <Text style={styles.matchMeta}>{coach.email}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#f7f7f7',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    color: '#555',
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionGap: {
    marginTop: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#1b4332',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  teamRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  teamRowActive: {
    borderColor: '#1b4332',
    backgroundColor: '#eef2ef',
  },
  teamName: {
    fontWeight: '700',
    fontSize: 16,
  },
  parentBox: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eef2ef',
    borderWidth: 1,
    borderColor: '#c5d0c8',
  },
  parentTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  coachInfo: {
    flex: 1,
    marginRight: 8,
  },
  matchRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  matchName: {
    fontWeight: '700',
  },
  matchMeta: {
    color: '#555',
    marginTop: 2,
  },
  clearLink: {
    color: '#9b2226',
    fontWeight: '600',
  },
  success: {
    marginTop: 12,
    color: '#1b4332',
    fontWeight: '600',
  },
  error: {
    marginTop: 12,
    color: '#9b2226',
  },
});
