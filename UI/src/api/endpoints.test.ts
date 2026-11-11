import { API_BASE_URL } from './config';
import { apiFetch } from './http';
import {
  createMatch,
  getMatch,
  listMatchAttendance,
  listMatches,
  lockMatchAttendance,
  markMatchAttendance,
  setMatchResult,
} from './matches';
import {
  listMyChildren,
  listMyCoaches,
  listMyMatches,
  listMyTeams,
  listMyTrainings,
} from './my';
import {
  addTeamCoach,
  createTeam,
  getTeam,
  listTeamCoaches,
  listTeamPlayers,
  listTeams,
  removeTeamCoach,
} from './teams';
import {
  createTraining,
  getTraining,
  listTrainingAttendance,
  listTrainings,
  lockTrainingAttendance,
  markTrainingAttendance,
  setTrainingCancelled,
  updateTraining,
} from './trainings';
import {
  changeUserRole,
  createUser,
  deletePlayer,
  getUser,
  listUsers,
  searchUsers,
  updatePlayer,
} from './users';

jest.mock('./http', () => {
  const actual = jest.requireActual('./http');
  return { ...actual, apiFetch: jest.fn() };
});

const mockedFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function ok(body: unknown = {}, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedFetch.mockImplementation(async () => ok({}));
});

/** What the function sent: method, path after /api, and parsed body. */
function lastCall() {
  const [url, init] = mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1];
  return {
    method: init?.method ?? 'GET',
    path: url.replace(API_BASE_URL, ''),
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
}

type Case = [string, () => Promise<unknown>, string, string, unknown?];

const time = '2026-11-12T17:30:00';

const cases: Case[] = [
  // my
  ['listMyTrainings', () => listMyTrainings(), 'GET', '/my/trainings'],
  ['listMyTrainings (child)', () => listMyTrainings(7), 'GET', '/my/trainings?childId=7'],
  ['listMyTrainings (upcoming)', () => listMyTrainings(undefined, 'upcoming'), 'GET', '/my/trainings?when=upcoming'],
  ['listMyTrainings (child, past)', () => listMyTrainings(7, 'past'), 'GET', '/my/trainings?childId=7&when=past'],
  ['listMyMatches', () => listMyMatches(), 'GET', '/my/matches'],
  ['listMyMatches (child, upcoming)', () => listMyMatches(7, 'upcoming'), 'GET', '/my/matches?childId=7&when=upcoming'],
  ['listMyMatches (child)', () => listMyMatches(7), 'GET', '/my/matches?childId=7'],
  ['listMyChildren', () => listMyChildren(), 'GET', '/my/children'],
  ['listMyCoaches (child)', () => listMyCoaches(7), 'GET', '/my/coaches?childId=7'],
  ['listMyTeams', () => listMyTeams(), 'GET', '/my/teams'],
  // teams
  ['listTeams', () => listTeams(), 'GET', '/teams'],
  ['getTeam', () => getTeam(3), 'GET', '/teams/3'],
  ['createTeam', () => createTeam('P12 Alfa'), 'POST', '/teams', { name: 'P12 Alfa' }],
  ['listTeamPlayers', () => listTeamPlayers(3), 'GET', '/teams/3/players'],
  ['listTeamCoaches', () => listTeamCoaches(3), 'GET', '/teams/3/coaches'],
  ['addTeamCoach', () => addTeamCoach(3, 9), 'POST', '/teams/3/coaches', { userId: 9 }],
  ['removeTeamCoach', () => removeTeamCoach(3, 9), 'DELETE', '/teams/3/coaches/9'],
  // trainings
  ['listTrainings', () => listTrainings(3), 'GET', '/trainings?teamId=3'],
  ['listTrainings (past)', () => listTrainings(3, 'past'), 'GET', '/trainings?teamId=3&when=past'],
  ['getTraining', () => getTraining(5), 'GET', '/trainings/5'],
  [
    'createTraining',
    () => createTraining({ teamId: 3, startsAt: time, endsAt: time, type: 'FITNESS' as const, venue: 'Konstgräs' }),
    'POST',
    '/trainings',
    { teamId: 3, startsAt: time, endsAt: time, type: 'FITNESS' as const, venue: 'Konstgräs' },
  ],
  [
    'updateTraining',
    () => updateTraining(5, { startsAt: time, endsAt: time, type: 'FITNESS' as const, venue: null }),
    'PUT',
    '/trainings/5',
    { startsAt: time, endsAt: time, type: 'FITNESS' as const, venue: null },
  ],
  [
    'setTrainingCancelled (cancel)',
    () => setTrainingCancelled(5, true, 'Snö'),
    'PUT',
    '/trainings/5/cancellation',
    { cancelled: true, reason: 'Snö' },
  ],
  [
    'setTrainingCancelled (reactivate)',
    () => setTrainingCancelled(5, false),
    'PUT',
    '/trainings/5/cancellation',
    { cancelled: false, reason: null },
  ],
  ['listTrainingAttendance', () => listTrainingAttendance(5), 'GET', '/trainings/5/attendance'],
  [
    'markTrainingAttendance',
    () => markTrainingAttendance(5, 11, 'PRESENT'),
    'PUT',
    '/trainings/5/attendance/11',
    { status: 'PRESENT' },
  ],
  ['lockTrainingAttendance', () => lockTrainingAttendance(5), 'PUT', '/trainings/5/attendance/lock'],
  // matches
  ['listMatches', () => listMatches(3), 'GET', '/matches?teamId=3'],
  ['listMatches (upcoming)', () => listMatches(3, 'upcoming'), 'GET', '/matches?teamId=3&when=upcoming'],
  ['getMatch', () => getMatch(8), 'GET', '/matches/8'],
  [
    'createMatch',
    () => createMatch({ teamId: 3, opponent: 'IFK', kickoffAt: time, venue: 'Arena', homeAway: 'HOME' }),
    'POST',
    '/matches',
    { teamId: 3, opponent: 'IFK', kickoffAt: time, venue: 'Arena', homeAway: 'HOME' },
  ],
  ['setMatchResult', () => setMatchResult(8, 3, 1), 'PUT', '/matches/8/result', { goalsFor: 3, goalsAgainst: 1 }],
  ['listMatchAttendance', () => listMatchAttendance(8), 'GET', '/matches/8/attendance'],
  [
    'markMatchAttendance',
    () => markMatchAttendance(8, 11, 'EXCUSED'),
    'PUT',
    '/matches/8/attendance/11',
    { status: 'EXCUSED' },
  ],
  ['lockMatchAttendance', () => lockMatchAttendance(8), 'PUT', '/matches/8/attendance/lock'],
  // users
  ['listUsers', () => listUsers(), 'GET', '/users'],
  ['getUser', () => getUser(4), 'GET', '/users/4'],
  [
    'createUser',
    () => createUser({ name: 'Nova', email: 'nova@fcvaxjo.se', roleName: 'PLAYER', teamId: 3 }),
    'POST',
    '/users',
    { name: 'Nova', email: 'nova@fcvaxjo.se', roleName: 'PLAYER', teamId: 3 },
  ],
  [
    'updatePlayer',
    () => updatePlayer(4, { name: 'Nova', email: 'nova@fcvaxjo.se', teamId: 3 }),
    'PUT',
    '/users/4/player',
    { name: 'Nova', email: 'nova@fcvaxjo.se', teamId: 3 },
  ],
  ['deletePlayer', () => deletePlayer(4), 'DELETE', '/users/4'],
  ['changeUserRole', () => changeUserRole(4, 'COACH'), 'PUT', '/users/4/role', { roleName: 'COACH' }],
  ['searchUsers (name)', () => searchUsers({ name: 'Lind' }), 'POST', '/users/search', { name: 'Lind' }],
  [
    'searchUsers (shirt)',
    () => searchUsers({ playerNumber: 10 }),
    'POST',
    '/users/search',
    { playerNumber: 10 },
  ],
  [
    'searchUsers (phone)',
    () => searchUsers({ phone: '0701234567' }),
    'POST',
    '/users/search',
    { phone: '0701234567' },
  ],
];

// Object rows, so jest never mistakes a missing body for a `done` callback.
const rows = cases.map(([name, call, method, path, body]) => ({ name, call, method, path, body }));

describe('each API function calls the right method, path and body', () => {
  test.each(rows)('$name', async ({ call, method, path, body }) => {
    await call();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(lastCall()).toEqual({ method, path, body });
  });
});

describe('a bare 403 becomes the Swedish message', () => {
  const forbidden = () =>
    new Response(JSON.stringify({ message: 'Access Denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });

  test.each(rows)('$name', async ({ call }) => {
    mockedFetch.mockImplementation(async () => forbidden());
    await expect(call()).rejects.toThrow(
      'Den här funktionen är inte tillgänglig för din roll än.',
    );
  });
});

test('shirt and phone search return a one-item list', async () => {
  mockedFetch.mockImplementation(async () => ok({ id: 4, name: 'Nova' }));
  await expect(searchUsers({ playerNumber: 10 })).resolves.toEqual([{ id: 4, name: 'Nova' }]);
});

test('a 204 answer resolves without parsing JSON', async () => {
  mockedFetch.mockImplementation(async () => ok(undefined, 204));
  await expect(deletePlayer(4)).resolves.toBeUndefined();
});
