import {
  assignableRoles,
  canChangeRole,
  canEditOrDeleteUser,
  canMakeCoach,
  isClubWide,
  TargetUser,
  Viewer,
  visibleTeams,
} from './permissions';
import { ClubRoleName } from './roles';

// Team 1 = P12 Alfa (the viewer's own team), team 2 = P12 Beta.
const ALFA = { id: 1, name: 'P12 Alfa' };
const BETA = { id: 2, name: 'P12 Beta' };
const ALL_TEAMS = [ALFA, BETA];

function viewer(role: ClubRoleName): Viewer {
  return { userId: 100, role, teamIds: [ALFA.id] };
}

const playerInAlfa: TargetUser = { id: 1, roleName: 'PLAYER', teamId: ALFA.id };
const playerInBeta: TargetUser = { id: 2, roleName: 'PLAYER', teamId: BETA.id };
const coach: TargetUser = { id: 3, roleName: 'COACH', teamId: null };
const parent: TargetUser = { id: 4, roleName: 'PARENT', teamId: null };

// One row per role: the expected answer for each rule.
const table: {
  role: ClubRoleName;
  clubWide: boolean;
  teams: number[];
  assignable: ClubRoleName[];
  changeRole: boolean;
  makeCoach: boolean;
  editAlfa: boolean;
  editBeta: boolean;
}[] = [
  {
    role: 'ADMIN',
    clubWide: true,
    teams: [1, 2],
    assignable: ['ADMIN', 'CHAIRMAN', 'COACH', 'PLAYER', 'PARENT'],
    changeRole: true,
    makeCoach: true,
    editAlfa: true,
    editBeta: true,
  },
  {
    role: 'CHAIRMAN',
    clubWide: true,
    teams: [1, 2],
    assignable: ['PLAYER', 'PARENT', 'COACH'],
    changeRole: false,
    makeCoach: true,
    editAlfa: true,
    editBeta: true,
  },
  {
    role: 'COACH',
    clubWide: false,
    teams: [1],
    assignable: [],
    changeRole: false,
    makeCoach: false,
    editAlfa: true,
    editBeta: false,
  },
  {
    role: 'PLAYER',
    clubWide: false,
    teams: [1],
    assignable: [],
    changeRole: false,
    makeCoach: false,
    editAlfa: false,
    editBeta: false,
  },
  {
    role: 'PARENT',
    clubWide: false,
    teams: [1],
    assignable: [],
    changeRole: false,
    makeCoach: false,
    editAlfa: false,
    editBeta: false,
  },
];

describe.each(table)('$role', (row) => {
  const me = viewer(row.role);

  test('isClubWide', () => {
    expect(isClubWide(row.role)).toBe(row.clubWide);
  });

  test('visibleTeams', () => {
    expect(visibleTeams(me, ALL_TEAMS).map((t) => t.id)).toEqual(row.teams);
  });

  test('assignableRoles', () => {
    expect([...assignableRoles(row.role)].sort()).toEqual([...row.assignable].sort());
  });

  test('canChangeRole on another user', () => {
    expect(canChangeRole(me, playerInAlfa)).toBe(row.changeRole);
  });

  test('canChangeRole is false on their own account', () => {
    expect(canChangeRole(me, { id: me.userId, roleName: row.role, teamId: null })).toBe(false);
  });

  test('canMakeCoach on a player, never on a coach or parent', () => {
    expect(canMakeCoach(me, playerInAlfa)).toBe(row.makeCoach);
    expect(canMakeCoach(me, coach)).toBe(false);
    expect(canMakeCoach(me, parent)).toBe(false);
  });

  test('canEditOrDeleteUser on players in each team', () => {
    expect(canEditOrDeleteUser(me, playerInAlfa)).toBe(row.editAlfa);
    expect(canEditOrDeleteUser(me, playerInBeta)).toBe(row.editBeta);
  });

  test('canEditOrDeleteUser is false for anyone who is not a player', () => {
    expect(canEditOrDeleteUser(me, coach)).toBe(false);
    expect(canEditOrDeleteUser(me, parent)).toBe(false);
  });
});

test('unknown or missing role is not club-wide and may assign nothing', () => {
  expect(isClubWide(undefined)).toBe(false);
  expect(assignableRoles('JANITOR')).toEqual([]);
});
