import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { listTeamCoaches, listTeamPlayers, listTeams, type Team } from '../api/teams';
import { ErrorText } from '../components/teams/ErrorText';
import { errorMessage } from '../components/teams/errors';
import {
  Button,
  Empty,
  List,
  Row,
  RowMeta,
  RowTitle,
  Screen,
  useRefresh,
} from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Teams'>;

type TeamSummary = Team & { playerCount: number; coachNames: string[] };

/**
 * GET /teams only has id and name, so the player count and coach names
 * come from one players call and one coaches call per team.
 */
async function loadSummaries(): Promise<TeamSummary[]> {
  const teams = await listTeams();
  return Promise.all(
    teams.map(async (team) => {
      const [players, coaches] = await Promise.all([
        listTeamPlayers(team.id),
        listTeamCoaches(team.id),
      ]);
      return {
        ...team,
        playerCount: players.length,
        coachNames: coaches.map((coach) => coach.name),
      };
    }),
  );
}

/** "8 spelare · Johan Berg, Sara Nilsson". */
function teamMeta(team: TeamSummary): string {
  const players = `${team.playerCount} spelare`;
  return team.coachNames.length > 0 ? `${players} · ${team.coachNames.join(', ')}` : players;
}

/** Lag (Ordförande, Admin; spec section 7): every team in the club. */
export default function TeamsScreen({ navigation }: Props) {
  const [teams, setTeams] = useState<TeamSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTeams(await loadSummaries());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  // Runs every time the screen gets focus, and again when the list is pulled down.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const refresh = useRefresh(load);

  return (
    <Screen
      title="Lag"
      refresh={refresh}
      bottom={<Button title="Nytt lag" block onPress={() => navigation.navigate('NewTeam')} />}
    >
      <ErrorText message={error} />
      {teams && teams.length === 0 ? <Empty text="Inga lag" /> : null}
      {teams && teams.length > 0 ? (
        <List>
          {teams.map((team) => (
            <Row
              key={team.id}
              onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}
            >
              <RowTitle>{team.name}</RowTitle>
              <RowMeta>{teamMeta(team)}</RowMeta>
            </Row>
          ))}
        </List>
      ) : null}
    </Screen>
  );
}
