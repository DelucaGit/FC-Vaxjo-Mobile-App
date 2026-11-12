import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { listTeamCoaches, listTeamPlayers } from '../../api/teams';
import type { ClubUser } from '../../api/users';
import { errorMessage } from './errors';

export type TeamRosterState = {
  coaches: ClubUser[];
  players: ClubUser[];
  /**
   * True once this team's coaches and players have arrived. Stays true during a
   * pull-to-refresh, so the list stays on screen; false again for a new team.
   */
  loaded: boolean;
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
  // Which team the lists above belong to. Another team means "not loaded yet".
  const [loadedTeamId, setLoadedTeamId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (teamId == null) {
      return;
    }
    try {
      const [nextCoaches, nextPlayers] = await Promise.all([
        listTeamCoaches(teamId),
        listTeamPlayers(teamId),
      ]);
      setCoaches(nextCoaches);
      setPlayers(nextPlayers);
      setLoadedTeamId(teamId);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [teamId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const loaded = teamId != null && loadedTeamId === teamId;
  return { coaches, players, loaded, error, reload };
}
