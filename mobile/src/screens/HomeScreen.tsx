import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Player, Team } from '../types';
import { colors, spacing } from '../theme';

export function HomeScreen() {
  const { user, logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [playerFirst, setPlayerFirst] = useState('');
  const [playerLast, setPlayerLast] = useState('');

  const canManage = user?.role === 'ADMIN' || user?.role === 'COACH';

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const teamList = await api.listTeams();
      setTeams(teamList);

      const teamId = selectedTeamId ?? teamList[0]?.id ?? null;
      setSelectedTeamId(teamId);

      const playerList = await api.listPlayers(teamId ?? undefined);
      setPlayers(playerList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load club data');
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreateTeam() {
    if (!teamName.trim()) {
      return;
    }
    setError(null);
    try {
      await api.createTeam({ name: teamName.trim(), season: '2026' });
      setTeamName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create team');
    }
  }

  async function onCreatePlayer() {
    if (!playerFirst.trim() || !playerLast.trim() || !selectedTeamId) {
      return;
    }
    setError(null);
    try {
      await api.createPlayer({
        firstName: playerFirst.trim(),
        lastName: playerLast.trim(),
        teamId: selectedTeamId,
      });
      setPlayerFirst('');
      setPlayerLast('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create player');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>FC Växjö</Text>
          <Text style={styles.userLine}>
            {user?.firstName} {user?.lastName} · {user?.role}
          </Text>
        </View>
        <Pressable onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      {loading && teams.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.pitch} />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListHeaderComponent={
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Teams</Text>
              <View style={styles.teamRow}>
                {teams.map((team) => (
                  <Pressable
                    key={team.id}
                    onPress={() => setSelectedTeamId(team.id)}
                    style={[
                      styles.teamChip,
                      selectedTeamId === team.id && styles.teamChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.teamChipText,
                        selectedTeamId === team.id && styles.teamChipTextActive,
                      ]}
                    >
                      {team.name}
                    </Text>
                  </Pressable>
                ))}
                {teams.length === 0 ? (
                  <Text style={styles.empty}>No teams yet.</Text>
                ) : null}
              </View>

              {canManage ? (
                <View style={styles.manageBox}>
                  <Text style={styles.manageTitle}>Add team</Text>
                  <TextInput
                    style={styles.input}
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="e.g. P12 Blå"
                    placeholderTextColor={colors.muted}
                  />
                  <Pressable style={styles.smallButton} onPress={onCreateTeam}>
                    <Text style={styles.smallButtonText}>Create team</Text>
                  </Pressable>

                  <Text style={[styles.manageTitle, { marginTop: spacing.md }]}>
                    Add player to selected team
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={playerFirst}
                    onChangeText={setPlayerFirst}
                    placeholder="First name"
                    placeholderTextColor={colors.muted}
                  />
                  <TextInput
                    style={styles.input}
                    value={playerLast}
                    onChangeText={setPlayerLast}
                    placeholder="Last name"
                    placeholderTextColor={colors.muted}
                  />
                  <Pressable style={styles.smallButton} onPress={onCreatePlayer}>
                    <Text style={styles.smallButtonText}>Create player</Text>
                  </Pressable>
                </View>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Text style={styles.sectionTitle}>Players</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.playerRow}>
              <Text style={styles.playerName}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={styles.playerMeta}>
                {item.teamName ?? 'No team'}
                {item.jerseyNumber != null ? ` · #${item.jerseyNumber}` : ''}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            !loading ? <Text style={styles.empty}>No players for this team.</Text> : null
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  topBar: {
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.pitch,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brand: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
  },
  userLine: {
    color: '#D7E8DF',
    marginTop: 4,
  },
  logout: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7E8DF',
  },
  logoutText: {
    color: colors.white,
    fontWeight: '600',
  },
  section: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  teamChip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  teamChipActive: {
    backgroundColor: colors.pitch,
    borderColor: colors.pitch,
  },
  teamChipText: {
    color: colors.ink,
    fontWeight: '600',
  },
  teamChipTextActive: {
    color: colors.white,
  },
  manageBox: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  manageTitle: {
    fontWeight: '700',
    color: colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.ink,
  },
  smallButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pitchLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  smallButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  playerRow: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  playerMeta: {
    color: colors.muted,
    marginTop: 2,
  },
  empty: {
    color: colors.muted,
    paddingHorizontal: spacing.lg,
  },
  error: {
    color: colors.danger,
  },
});
