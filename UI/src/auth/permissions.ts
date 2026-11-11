import { ClubRoleName } from './roles';

/**
 * Who may do what, as pure functions (design spec section 6).
 * The API still decides. These rules only hide buttons the API would refuse,
 * so the user never taps something that ends in a 403.
 *
 * Role names are the API's: ADMIN, CHAIRMAN, COACH, PLAYER, PARENT.
 */

/** The logged-in person, plus the teams they are linked to. */
export type Viewer = {
  userId: number;
  role: ClubRoleName;
  /**
   * COACH: teams they train (GET /my/teams).
   * PLAYER: their own team. PARENT: their children's teams (GET /my/children).
   * ADMIN and CHAIRMAN: not needed, they see every team.
   */
  teamIds: readonly number[];
};

/** The person a screen is about. Fields match ClubUser from the API. */
export type TargetUser = {
  id: number;
  roleName: string;
  teamId: number | null;
};

const ALL_ROLES: readonly ClubRoleName[] = ['ADMIN', 'CHAIRMAN', 'COACH', 'PLAYER', 'PARENT'];
const CHAIRMAN_ROLES: readonly ClubRoleName[] = ['PLAYER', 'PARENT', 'COACH'];
const NO_ROLES: readonly ClubRoleName[] = [];

/** ADMIN and CHAIRMAN look after the whole club, not one team. */
export function isClubWide(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'CHAIRMAN';
}

/**
 * A training or match start that has already passed (issue #115).
 * Only ADMIN, so old history can be fixed. Same rule as the API.
 */
export function canSetPastActivityTime(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

/** Club-wide roles see every team; everyone else only their linked teams. */
export function visibleTeams<T extends { id: number }>(viewer: Viewer, allTeams: readonly T[]): T[] {
  if (isClubWide(viewer.role)) {
    return [...allTeams];
  }
  return allTeams.filter((team) => viewer.teamIds.includes(team.id));
}

/** Roles shown on "Ny användare". A coach adds players via "Ny spelare" instead. */
export function assignableRoles(role: string | null | undefined): readonly ClubRoleName[] {
  if (role === 'ADMIN') {
    return ALL_ROLES;
  }
  if (role === 'CHAIRMAN') {
    return CHAIRMAN_ROLES;
  }
  return NO_ROLES;
}

/**
 * Only ADMIN, and never on their own account. The API would let admin change
 * their own role, but the app hides it so admin cannot lock themselves out.
 */
export function canChangeRole(viewer: Viewer, target: TargetUser): boolean {
  return viewer.role === 'ADMIN' && viewer.userId !== target.id;
}

/** "Gör till tränare": ADMIN or CHAIRMAN, and only on a player. */
export function canMakeCoach(viewer: Viewer, target: TargetUser): boolean {
  return isClubWide(viewer.role) && target.roleName === 'PLAYER';
}

/**
 * Only players can be edited or removed (the API has no call for anyone else).
 * Staff only: a PLAYER or PARENT can see a team but may not edit it.
 * A COACH only on the teams they train.
 */
export function canEditOrDeleteUser(viewer: Viewer, target: TargetUser): boolean {
  if (target.roleName !== 'PLAYER' || target.teamId == null) {
    return false;
  }
  if (isClubWide(viewer.role)) {
    return true;
  }
  return viewer.role === 'COACH' && viewer.teamIds.includes(target.teamId);
}
