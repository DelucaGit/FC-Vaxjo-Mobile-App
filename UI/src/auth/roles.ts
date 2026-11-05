/**
 * Club roles, same order of power as the API (`ClubRole`, ADR 0006).
 *
 * The number is the rank, not a database id.
 * PLAYER and PARENT share a rank because they are equal.
 *
 * ADMIN (4) > CHAIRMAN (3) > COACH (2) > PLAYER (1) = PARENT (1).
 */
export const CLUB_ROLES = ['ADMIN', 'CHAIRMAN', 'COACH', 'PLAYER', 'PARENT'] as const;

export type ClubRoleName = (typeof CLUB_ROLES)[number];

const RANK: Record<ClubRoleName, number> = {
  ADMIN: 4,
  CHAIRMAN: 3,
  COACH: 2,
  PLAYER: 1,
  PARENT: 1,
};

/** Roles an admin may assign. Same list the create-user screen showed, plus CHAIRMAN. */
const ROLES_AN_ADMIN_MAY_ASSIGN: readonly ClubRoleName[] = [
  'PLAYER',
  'PARENT',
  'COACH',
  'CHAIRMAN',
  'ADMIN',
];

export function isClubRole(roleName: string | null | undefined): roleName is ClubRoleName {
  return roleName != null && (CLUB_ROLES as readonly string[]).includes(roleName);
}

/** Unknown or missing roles rank below everyone, so they get no staff access. */
export function rankOf(roleName: string | null | undefined): number {
  if (!isClubRole(roleName)) {
    return 0;
  }
  return RANK[roleName];
}

/** True when this role is the same rank or higher. Equal roles do not outrank each other. */
export function isAtLeast(
  roleName: string | null | undefined,
  minimum: ClubRoleName,
): boolean {
  return rankOf(roleName) >= RANK[minimum];
}

/**
 * Screens a coach already has: attendance, create user, edit a roster.
 * Chairman is above coach, so the same checks include CHAIRMAN.
 */
export function isStaff(roleName: string | null | undefined): boolean {
  return isAtLeast(roleName, 'COACH');
}

/** Player and parent stay equal. Chairman is staff, not a member. */
export function isMember(roleName: string | null | undefined): boolean {
  return roleName === 'PLAYER' || roleName === 'PARENT';
}

/**
 * POST /api/teams allows only ADMIN and CHAIRMAN.
 * A coach, player, or parent must not see the button or the screen.
 */
export function canCreateTeam(roleName: string | null | undefined): boolean {
  return roleName === 'ADMIN' || roleName === 'CHAIRMAN';
}

/**
 * Roles shown on "create user".
 * A coach may only create a player (the API enforces that).
 * A chairman is above a coach, so the picker includes at least that.
 * ADR 0006 still asks whether a chairman may create a coach, and
 * POST /api/users does not allow CHAIRMAN yet, so we do not offer more.
 * An admin may assign every club role, including chairman.
 */
export function assignableRoles(
  roleName: string | null | undefined,
): readonly ClubRoleName[] {
  if (roleName === 'ADMIN') {
    return ROLES_AN_ADMIN_MAY_ASSIGN;
  }
  if (roleName === 'COACH' || roleName === 'CHAIRMAN') {
    return ['PLAYER'];
  }
  return [];
}

/** Swedish label for the role badge. Unknown values stay as the API sent them. */
export function roleLabel(roleName: string | null | undefined): string {
  switch (roleName) {
    case 'ADMIN':
      return 'Admin';
    case 'CHAIRMAN':
      return 'Ordförande';
    case 'COACH':
      return 'Tränare';
    case 'PLAYER':
      return 'Spelare';
    case 'PARENT':
      return 'Förälder';
    default:
      return roleName ?? '';
  }
}
