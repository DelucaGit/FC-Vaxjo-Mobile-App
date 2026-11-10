import type { AuthSession } from '../../api/authStorage';
import type { ClubUser } from '../../api/users';
import type { Viewer } from '../../auth/permissions';
import { isClubRole, roleLabel } from '../../auth/roles';

/**
 * "Spelare · F12" for a player. Only players have a team on the user,
 * so every other role shows just the role name.
 */
export function roleAndTeam(user: Pick<ClubUser, 'roleName' | 'teamName'>): string {
  const role = roleLabel(user.roleName);
  if (user.roleName === 'PLAYER' && user.teamName) {
    return `${role} · ${user.teamName}`;
  }
  return role;
}

/**
 * Search on shirt number or phone answers 404 "User not found" on a miss.
 * That is not an error for the user, it just means "Inga träffar".
 */
export function isNotFound(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /not found|\(404\)/i.test(message);
}

/**
 * The logged-in person in the shape permissions.ts wants.
 * teamIds stays empty: the rules used on these screens do not need it.
 * An unknown role becomes PLAYER, which may do nothing here.
 */
export function viewerFromSession(session: AuthSession | null): Viewer | null {
  if (!session) {
    return null;
  }
  return {
    userId: session.userId,
    role: isClubRole(session.roleName) ? session.roleName : 'PLAYER',
    teamIds: [],
  };
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Något gick fel.';
}
