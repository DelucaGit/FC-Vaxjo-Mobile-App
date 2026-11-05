import {
  assignableRoles,
  canCreateTeam,
  isAtLeast,
  isMember,
  isStaff,
  rankOf,
  roleLabel,
} from './roles';

describe('club roles', () => {
  test('rank follows ADMIN > CHAIRMAN > COACH > PLAYER = PARENT', () => {
    expect(rankOf('ADMIN')).toBeGreaterThan(rankOf('CHAIRMAN'));
    expect(rankOf('CHAIRMAN')).toBeGreaterThan(rankOf('COACH'));
    expect(rankOf('COACH')).toBeGreaterThan(rankOf('PLAYER'));
    expect(rankOf('PLAYER')).toBe(rankOf('PARENT'));
    expect(rankOf('NOBODY')).toBe(0);
    expect(rankOf(null)).toBe(0);
  });

  test('chairman is staff, a player is not, and player does not outrank parent', () => {
    expect(isStaff('ADMIN')).toBe(true);
    expect(isStaff('CHAIRMAN')).toBe(true);
    expect(isStaff('COACH')).toBe(true);
    expect(isStaff('PLAYER')).toBe(false);
    expect(isStaff('PARENT')).toBe(false);

    expect(isAtLeast('CHAIRMAN', 'COACH')).toBe(true);
    expect(isAtLeast('PLAYER', 'COACH')).toBe(false);
    expect(isAtLeast('PLAYER', 'PARENT')).toBe(true);
    expect(isAtLeast('PARENT', 'PLAYER')).toBe(true);

    expect(isMember('PLAYER')).toBe(true);
    expect(isMember('PARENT')).toBe(true);
    expect(isMember('CHAIRMAN')).toBe(false);
  });

  test('only admin and chairman can create a team', () => {
    expect(canCreateTeam('ADMIN')).toBe(true);
    expect(canCreateTeam('CHAIRMAN')).toBe(true);
    expect(canCreateTeam('COACH')).toBe(false);
    expect(canCreateTeam('PLAYER')).toBe(false);
    expect(canCreateTeam('PARENT')).toBe(false);
    expect(canCreateTeam(undefined)).toBe(false);
  });

  test('labels include Ordförande and keep an unknown role readable', () => {
    expect(roleLabel('CHAIRMAN')).toBe('Ordförande');
    expect(roleLabel('COACH')).toBe('Tränare');
    expect(roleLabel('ADMIN')).toBe('Admin');
    expect(roleLabel('PLAYER')).toBe('Spelare');
    expect(roleLabel('PARENT')).toBe('Förälder');
    expect(roleLabel('GUEST')).toBe('GUEST');
    expect(roleLabel(null)).toBe('');
  });

  test('create-user picker matches the API', () => {
    expect(assignableRoles('ADMIN')).toEqual([
      'PLAYER',
      'PARENT',
      'COACH',
      'CHAIRMAN',
      'ADMIN',
    ]);
    // POST /api/users: a chairman may create a player, a parent, or a coach.
    expect(assignableRoles('CHAIRMAN')).toEqual(['PLAYER', 'PARENT', 'COACH']);
    expect(assignableRoles('COACH')).toEqual(['PLAYER']);
    expect(assignableRoles('PLAYER')).toEqual([]);
    expect(assignableRoles('PARENT')).toEqual([]);
  });
});
