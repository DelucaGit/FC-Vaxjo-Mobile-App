import { listMyTeams, listTeams, type Team } from '../../api/teams';
import { isClubWide } from '../../auth/permissions';

/**
 * Teams the logged-in person may put a player on.
 * ADMIN and CHAIRMAN: every team. COACH: only the teams they train.
 * (GET /my/teams does not allow CHAIRMAN, so club-wide roles use GET /teams.)
 */
export function loadVisibleTeams(role: string | null | undefined): Promise<Team[]> {
  return isClubWide(role) ? listTeams() : listMyTeams();
}
