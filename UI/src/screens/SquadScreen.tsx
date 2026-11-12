import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { listMyTeams, type Team } from '../api/teams';
import { ErrorText } from '../components/teams/ErrorText';
import { errorMessage } from '../components/teams/errors';
import { TeamRoster } from '../components/teams/TeamRoster';
import { useTeamRoster } from '../components/teams/useTeamRoster';
import {
  Button,
  Empty,
  Screen,
  SectionLabel,
  Segmented,
  SkeletonList,
  useRefresh,
} from '../components/ui';
import type { AppStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Squad'>;

/**
 * "Laget" for a coach (spec section 7): team picker, then coaches and players.
 * Read only for the coaches; a coach cannot add or remove coaches.
 */
export default function SquadScreen({ navigation }: Props) {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const roster = useTeamRoster(teamId);

  // Written with .then (not async/await) so the lint rule can see that setState runs later, not inside the effect.
  const loadTeams = useCallback(
    () =>
      listMyTeams()
        .then((mine) => {
          setTeams(mine);
          setTeamsError(null);
          // Keep the chosen team on a refresh, unless it is gone from the list.
          setTeamId((current) =>
            mine.some((team) => team.id === current) ? current : (mine[0]?.id ?? null),
          );
        })
        .catch((e) => setTeamsError(errorMessage(e))),
    [],
  );

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  // Pulling down loads both the teams and the chosen team's coaches and players.
  const { reload: reloadRoster } = roster;
  const loadAll = useCallback(
    () => Promise.all([loadTeams(), reloadRoster()]),
    [loadTeams, reloadRoster],
  );
  const refresh = useRefresh(loadAll);

  return (
    <Screen
      title="Laget"
      refresh={refresh}
      bottom={
        teamId != null ? (
          <Button
            title="Ny spelare"
            block
            onPress={() => navigation.navigate('NewPlayer', { teamId })}
          />
        ) : undefined
      }
    >
      <ErrorText message={teamsError ?? roster.error} />
      {teams && teams.length === 0 ? <Empty text="Inga lag" /> : null}
      {teams && teams.length > 1 ? (
        <View style={styles.picker}>
          <Segmented
            accessibilityLabel="Välj lag"
            options={teams.map((team) => ({ label: team.name, value: team.id }))}
            value={teamId}
            onChange={setTeamId}
          />
        </View>
      ) : null}
      {teams && teams.length === 1 ? <SectionLabel title={teams[0].name} /> : null}
      {/* First load (or a new team): grey rows until the coaches and players arrive. */}
      {!teamsError && !roster.error && (teams === null || (teamId != null && !roster.loaded)) ? (
        <SkeletonList />
      ) : null}
      {teamId != null && roster.loaded && !roster.error ? (
        <TeamRoster
          coaches={roster.coaches}
          players={roster.players}
          onPlayerPress={(player) => navigation.navigate('PlayerView', { userId: player.id })}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  picker: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
});
