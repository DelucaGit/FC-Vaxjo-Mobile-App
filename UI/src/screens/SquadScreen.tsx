import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { listMyTeams, type Team } from '../api/teams';
import { ErrorText } from '../components/teams/ErrorText';
import { errorMessage } from '../components/teams/errors';
import { TeamRoster } from '../components/teams/TeamRoster';
import { useTeamRoster } from '../components/teams/useTeamRoster';
import { Button, Empty, Screen, SectionLabel, Segmented } from '../components/ui';
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

  useEffect(() => {
    listMyTeams()
      .then((mine) => {
        setTeams(mine);
        setTeamId(mine[0]?.id ?? null);
      })
      .catch((e) => setTeamsError(errorMessage(e)));
  }, []);

  return (
    <Screen
      title="Laget"
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
      {teamId != null && !roster.error ? (
        <TeamRoster
          coaches={roster.coaches}
          players={roster.players}
          onPlayerPress={(player) => navigation.navigate('PlayerProfile', { userId: player.id })}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  picker: { paddingHorizontal: spacing.page, paddingTop: spacing.page },
});
