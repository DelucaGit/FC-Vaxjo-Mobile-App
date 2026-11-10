import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { listTeamCoaches, listTeamPlayers } from '../../api/teams';
import type { ClubUser } from '../../api/users';
import { errorMessage } from './errors';

export type TeamRosterState = {
  coaches: ClubUser[];
  players: ClubUser[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * Loads the coaches and players of one team, and again each time the screen
 * comes back into view (e.g. after Lägg till tränare or Ny spelare).
 * teamId null means no team is chosen yet, so nothing is loaded.
 */
export function useTeamRoster(teamId: number | null): TeamRosterState {
  const [coaches, setCoaches] = useState<ClubUser[]>([]);
  const [players, setPlayers] = useState<ClubUser[]>([]);
  const [loading, setLoading] = useState(teamId != null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (teamId == null) {
      return;
    }
    setLoading(true);
    try {
      const [nextCoaches, nextPlayers] = await Promise.all([
        listTeamCoaches(teamId),
        listTeamPlayers(teamId),
      ]);
      setCoaches(nextCoaches);
      setPlayers(nextPlayers);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { coaches, players, loading, error, reload };
}
