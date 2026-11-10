import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTeam, removeTeamCoach } from '../api/teams';
import type { ClubUser } from '../api/users';
import { ErrorText } from '../components/teams/ErrorText';
import { errorMessage } from '../components/teams/errors';
import { TeamRoster } from '../components/teams/TeamRoster';
import { useTeamRoster } from '../components/teams/useTeamRoster';
import { Button, Confirm, Screen } from '../components/ui';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'TeamDetail'>;

/**
 * Lagsida (Ordförande, Admin; spec section 7). Like Laget, but coaches can be
 * added ("Lägg till tränare") and removed ("Ta bort" with a confirm dialog).
 */
export default function TeamDetailScreen({ navigation, route }: Props) {
  const { teamId } = route.params;
  const [teamName, setTeamName] = useState('Lag');
  const [actionError, setActionError] = useState<string | null>(null);
  const [coachToRemove, setCoachToRemove] = useState<ClubUser | null>(null);
  const roster = useTeamRoster(teamId);

  useEffect(() => {
    getTeam(teamId)
      .then((team) => setTeamName(team.name))
      .catch((e) => setActionError(errorMessage(e)));
  }, [teamId]);

  async function removeCoach() {
    const coach = coachToRemove;
    setCoachToRemove(null);
    if (!coach) {
      return;
    }
    try {
      await removeTeamCoach(teamId, coach.id);
      setActionError(null);
      await roster.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  return (
    <Screen
      title={teamName}
      onBack={() => navigation.goBack()}
      bottom={
        <Button
          title="Ny spelare"
          block
          onPress={() => navigation.navigate('NewPlayer', { teamId })}
        />
      }
    >
      <ErrorText message={actionError ?? roster.error} />
      {!roster.error ? (
        <TeamRoster
          coaches={roster.coaches}
          players={roster.players}
          onPlayerPress={(player) => navigation.navigate('PlayerProfile', { userId: player.id })}
          onAddCoach={() => navigation.navigate('AddCoach', { teamId })}
          onRemoveCoach={setCoachToRemove}
        />
      ) : null}
      <Confirm
        visible={coachToRemove != null}
        title={`Ta bort ${coachToRemove?.name ?? ''} från laget?`}
        confirmLabel="Ta bort"
        onConfirm={() => void removeCoach()}
        onCancel={() => setCoachToRemove(null)}
      />
    </Screen>
  );
}
