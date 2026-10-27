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
  listTeamPlayers,
  listTeams,
  removeTeamCoach,
} from '../api/teams';
import {
  ClubUser,
  searchByName,
  softDeletePlayer,
  updatePlayer,
} from '../api/users';

export default function TeamsScreen() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [coaches, setCoaches] = useState<ClubUser[]>([]);
  const [players, setPlayers] = useState<ClubUser[]>([]);
  const [coachSearch, setCoachSearch] = useState('');
  const [coachMatches, setCoachMatches] = useState<ClubUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingPlayer, setEditingPlayer] = useState<ClubUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editShirt, setEditShirt] = useState('');
  const [editTeamId, setEditTeamId] = useState<number | null>(null);
  const [editParentName, setEditParentName] = useState('');
  const [editParentEmail, setEditParentEmail] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');

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

  async function reloadSelectedTeamMembers(team: Team) {
    const [teamCoaches, teamPlayers] = await Promise.all([
      listTeamCoaches(team.id),
      listTeamPlayers(team.id),
    ]);
    setCoaches(teamCoaches);
    setPlayers(teamPlayers);
  }

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
      setPlayers([]);
      setEditingPlayer(null);
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
    setEditingPlayer(null);
    try {
      await reloadSelectedTeamMembers(team);
    } catch (err) {
      setCoaches([]);
      setPlayers([]);
      setError(err instanceof Error ? err.message : 'Could not load team members.');
    }
  }

  function openPlayer(player: ClubUser) {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditEmail(player.email);
    setEditPhone(player.mobilePhoneNumber ?? '');
    setEditShirt(player.playerNumber != null ? String(player.playerNumber) : '');
    setEditTeamId(player.teamId);
    setEditParentName(player.parentName ?? '');
    setEditParentEmail(player.parentEmail ?? '');
    setEditParentPhone(player.parentMobilePhoneNumber ?? '');
    setError(null);
    setMessage(null);
  }

  async function onSavePlayer() {
    if (!editingPlayer || editTeamId == null) {
      setError('Team is required.');
      return;
    }
    if (!editName.trim()) {
      setError('Name is required.');
      return;
    }
    if (!editEmail.trim()) {
      setError('Email is required.');
      return;
    }

    let shirt: number | null = null;
    if (editShirt.trim()) {
      shirt = Number(editShirt.trim());
      if (Number.isNaN(shirt)) {
        setError('Shirt number must be a number.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updatePlayer(editingPlayer.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        mobilePhoneNumber: editPhone.trim() || null,
        playerNumber: shirt,
        teamId: editTeamId,
        parentId: editingPlayer.parentId,
        parentName: editParentName.trim() || null,
        parentEmail: editParentEmail.trim() || null,
        parentMobilePhoneNumber: editParentPhone.trim() || null,
      });

      setMessage(`Saved ${updated.name}.`);
      setEditingPlayer(null);
      await loadTeams();

      if (selectedTeam) {
        if (updated.teamId !== selectedTeam.id) {
          const movedTo = teams.find((t) => t.id === updated.teamId);
          setMessage(
            `Saved ${updated.name}. Moved to ${updated.teamName ?? movedTo?.name ?? 'another team'}.`,
          );
          await reloadSelectedTeamMembers(selectedTeam);
        } else {
          await reloadSelectedTeamMembers(selectedTeam);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onRemovePlayer() {
    if (!editingPlayer) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await softDeletePlayer(editingPlayer.id);
      setMessage(`Removed ${editingPlayer.name} (soft delete).`);
      setEditingPlayer(null);
      if (selectedTeam) {
        await reloadSelectedTeamMembers(selectedTeam);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed.');
    } finally {
      setLoading(false);
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
      <Text style={styles.hint}>Create a team, assign coaches, tap a player to edit.</Text>

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
          <Text style={styles.parentTitle}>Players on {selectedTeam.name}</Text>
          {players.length === 0 ? (
            <Text style={styles.hint}>No players on this team yet.</Text>
          ) : null}
          {players.map((player) => (
            <Pressable
              key={player.id}
              style={[
                styles.matchRow,
                editingPlayer?.id === player.id ? styles.teamRowActive : null,
              ]}
              onPress={() => openPlayer(player)}
            >
              <Text style={styles.matchName}>{player.name}</Text>
              <Text style={styles.matchMeta}>
                Shirt #: {player.playerNumber ?? '—'} · Parent: {player.parentName ?? '—'}
              </Text>
            </Pressable>
          ))}

          {editingPlayer ? (
            <View style={styles.detailBox}>
              <Text style={styles.parentTitle}>Edit {editingPlayer.name}</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Shirt number</Text>
              <TextInput
                style={styles.input}
                value={editShirt}
                onChangeText={setEditShirt}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Team</Text>
              <View style={styles.modeRow}>
                {teams.map((team) => (
                  <Pressable
                    key={team.id}
                    onPress={() => setEditTeamId(team.id)}
                    style={[
                      styles.modeButton,
                      editTeamId === team.id ? styles.modeButtonActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        editTeamId === team.id ? styles.modeButtonTextActive : null,
                      ]}
                    >
                      {team.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Parent name</Text>
              <TextInput
                style={styles.input}
                value={editParentName}
                onChangeText={setEditParentName}
              />

              <Text style={styles.label}>Parent email</Text>
              <TextInput
                style={styles.input}
                value={editParentEmail}
                onChangeText={setEditParentEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Parent phone</Text>
              <TextInput
                style={styles.input}
                value={editParentPhone}
                onChangeText={setEditParentPhone}
                keyboardType="phone-pad"
              />

              <Pressable style={styles.button} onPress={onSavePlayer} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Save player'}</Text>
              </Pressable>
              <Pressable style={styles.dangerButton} onPress={onRemovePlayer} disabled={loading}>
                <Text style={styles.buttonText}>Remove player</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => setEditingPlayer(null)}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={[styles.parentTitle, styles.sectionGap]}>
            Coaches on {selectedTeam.name}
          </Text>

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
    marginBottom: 8,
  },
  dangerButton: {
    backgroundColor: '#9b2226',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: '#1b4332',
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
  detailBox: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1b4332',
  },
  parentTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e5e5e5',
  },
  modeButtonActive: {
    backgroundColor: '#1b4332',
  },
  modeButtonText: {
    fontWeight: '600',
    color: '#222',
    fontSize: 12,
  },
  modeButtonTextActive: {
    color: '#fff',
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
    marginBottom: 8,
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
