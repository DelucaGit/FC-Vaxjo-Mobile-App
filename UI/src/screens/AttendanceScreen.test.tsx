import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { readErrorMessage } from '../api/http';
import * as matches from '../api/matches';
import * as trainings from '../api/trainings';
import type { AttendanceRow } from '../api/trainings';
import { deferred } from '../test/deferred';
import { pullToRefresh } from '../test/pullToRefresh';
import AttendanceScreen from './AttendanceScreen';

jest.mock('../api/trainings', () => ({
  getTraining: jest.fn(),
  listTrainingAttendance: jest.fn(),
  markTrainingAttendance: jest.fn(),
  lockTrainingAttendance: jest.fn(),
}));
jest.mock('../api/matches', () => ({
  getMatch: jest.fn(),
  listMatchAttendance: jest.fn(),
  markMatchAttendance: jest.fn(),
  lockMatchAttendance: jest.fn(),
}));

const t = jest.mocked(trainings);
const m = jest.mocked(matches);

const training: trainings.Training = {
  id: 5,
  teamId: 1,
  teamName: 'P12 Alfa',
  startsAt: '2026-11-09T17:30:00',
  endsAt: '2026-11-09T19:00:00',
  type: 'FOOTBALL',
  venue: 'Värendsvallen',
  status: 'SCHEDULED',
  cancelReason: null,
  createdByUserId: 2,
  attendanceLockedAt: null,
};

const match: matches.Match = {
  id: 8,
  teamId: 1,
  teamName: 'P12 Alfa',
  opponent: 'Öster',
  kickoffAt: '2026-11-14T10:00:00',
  venue: 'Värendsvallen',
  homeAway: 'HOME',
  result: null,
  createdByUserId: 2,
  attendanceLockedAt: null,
} as matches.Match;

/** Alva already marked absent, Bo and Cleo unmarked, Dani has approved leave. */
function rows(): AttendanceRow[] {
  return [
    { playerUserId: 11, playerName: 'Alva Berg', playerNumber: 7, status: 'ABSENT' },
    { playerUserId: 12, playerName: 'Bo Ek', playerNumber: 9, status: null },
    { playerUserId: 13, playerName: 'Cleo Lind', playerNumber: null, status: null },
    { playerUserId: 14, playerName: 'Dani Holm', playerNumber: 4, status: 'EXCUSED' },
  ];
}

function renderScreen(kind: 'training' | 'match' = 'training', id = 5) {
  const navigation = { goBack: jest.fn() };
  const route = { key: 'Attendance-1', name: 'Attendance' as const, params: { kind, id } };
  // Only goBack is used by the screen.
  return render(<AttendanceScreen navigation={navigation as never} route={route} />);
}

function player(id: number) {
  return within(screen.getByTestId(`player-${id}`));
}

/** Tapping a player's row switches between Närvarande and Frånvarande. */
function tap(name: string) {
  return fireEvent.press(screen.getByRole('button', { name }));
}

async function pressSpara() {
  await fireEvent.press(screen.getByRole('button', { name: 'Spara' }));
}

async function confirmSave() {
  // The dialog's own button is the last "Spara" on the screen.
  const buttons = screen.getAllByRole('button', { name: 'Spara' });
  await fireEvent.press(buttons[buttons.length - 1]);
}

/** Local time, the same way the app reads the API's date-time strings. */
function localTime(year: number, month: number, day: number, hour: number, minute: number): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

/** The screen reads "now" from Date.now(). A fixed value keeps the tests stable. */
let now: jest.SpyInstance<number, []>;

beforeEach(() => {
  jest.clearAllMocks();
  // After the training (9 nov) and the match (14 nov 10:00), so attendance is open.
  now = jest.spyOn(Date, 'now').mockReturnValue(localTime(2026, 11, 14, 12, 0));
  t.getTraining.mockResolvedValue(training);
  t.listTrainingAttendance.mockResolvedValue(rows());
  t.markTrainingAttendance.mockImplementation(async (_tid, playerUserId, status) => ({
    playerUserId,
    playerName: '',
    playerNumber: null,
    status,
  }));
  t.lockTrainingAttendance.mockResolvedValue({
    ...training,
    attendanceLockedAt: '2026-11-12T19:05:00',
  });
  m.getMatch.mockResolvedValue(match);
  m.listMatchAttendance.mockResolvedValue(rows());
  m.markMatchAttendance.mockImplementation(async (_mid, playerUserId, status) => ({
    playerUserId,
    playerName: '',
    playerNumber: null,
    status,
  }));
  m.lockMatchAttendance.mockResolvedValue({ ...match, attendanceLockedAt: '2026-11-14T12:05:00' });
});

afterEach(() => {
  now.mockRestore();
});

test('opens with every unmarked player as Närvarande and keeps saved marks', async () => {
  await renderScreen();

  expect(await screen.findByText('Fotbollsträning')).toBeTruthy();
  expect(screen.getByText('Mån 9 nov · 17:30–19:00')).toBeTruthy();
  expect(player(11).getByText('Frånvarande')).toBeTruthy();
  expect(player(12).getByText('Närvarande')).toBeTruthy();
  expect(player(13).getByText('Närvarande')).toBeTruthy();
  expect(player(11).getByText('#7')).toBeTruthy();
  expect(screen.getByText('2 närvarande · 1 frånvarande · 1 ledig')).toBeTruthy();
  expect(screen.queryByText(/ej markerade/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Spara' })).toBeEnabled();
  // The old flow is gone.
  expect(screen.queryByRole('button', { name: /Klar|Markera alla/ })).toBeNull();
});

test('approved leave shows as Ledig and cannot be tapped', async () => {
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  expect(player(14).getByText('Ledig')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Dani Holm' })).toBeNull();
  expect(screen.queryByText('Ursäktad')).toBeNull();
});

test('tapping a player toggles the mark locally and sends nothing', async () => {
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  await tap('Bo Ek');
  expect(player(12).getByText('Frånvarande')).toBeTruthy();
  expect(screen.getByText('1 närvarande · 2 frånvarande · 1 ledig')).toBeTruthy();

  await tap('Bo Ek');
  expect(player(12).getByText('Närvarande')).toBeTruthy();

  await tap('Alva Berg');
  expect(player(11).getByText('Närvarande')).toBeTruthy();

  expect(t.markTrainingAttendance).not.toHaveBeenCalled();
  expect(t.lockTrainingAttendance).not.toHaveBeenCalled();
});

test('Spara asks first; cancelling sends nothing and locks nothing', async () => {
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  await tap('Bo Ek');
  await pressSpara();

  expect(screen.getByText('Spara och låsa närvaron?')).toBeTruthy();
  expect(screen.getByText('Den går inte att ändra efteråt.')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Avbryt' }));

  expect(t.markTrainingAttendance).not.toHaveBeenCalled();
  expect(t.lockTrainingAttendance).not.toHaveBeenCalled();
  // The local mark is still there.
  expect(player(12).getByText('Frånvarande')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Spara' })).toBeEnabled();
});

test('confirming writes one mark per player (not Ledig), then locks', async () => {
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  await tap('Bo Ek');
  await pressSpara();
  await confirmSave();

  await waitFor(() => expect(t.lockTrainingAttendance).toHaveBeenCalledWith(5));
  expect(t.markTrainingAttendance).toHaveBeenCalledTimes(3);
  expect(t.markTrainingAttendance).toHaveBeenCalledWith(5, 11, 'ABSENT');
  expect(t.markTrainingAttendance).toHaveBeenCalledWith(5, 12, 'ABSENT');
  expect(t.markTrainingAttendance).toHaveBeenCalledWith(5, 13, 'PRESENT');
  expect(t.markTrainingAttendance).not.toHaveBeenCalledWith(5, 14, expect.anything());
  // Lock comes after every write.
  const lastMark = Math.max(...t.markTrainingAttendance.mock.invocationCallOrder);
  expect(t.lockTrainingAttendance.mock.invocationCallOrder[0]).toBeGreaterThan(lastMark);

  expect(await screen.findByText('Närvaro låst')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Spara' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Bo Ek' })).toBeNull();
  expect(player(12).getByText('Frånvarande')).toBeTruthy();
});

test('a failed write: no lock, a Swedish error, and the marks are kept', async () => {
  t.markTrainingAttendance.mockImplementation(async (_tid, playerUserId, status) => {
    if (playerUserId === 13) throw new Error('Network request failed');
    return { playerUserId, playerName: '', playerNumber: null, status };
  });
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  await tap('Bo Ek');
  await pressSpara();
  await confirmSave();

  expect(await screen.findByText('Närvaron kunde inte sparas. Försök igen.')).toBeTruthy();
  expect(t.lockTrainingAttendance).not.toHaveBeenCalled();
  expect(screen.queryByText('Närvaro låst')).toBeNull();
  expect(player(12).getByText('Frånvarande')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Bo Ek' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Spara' })).toBeEnabled();
});

test('a failed lock: the list stays open and the coach sees an error', async () => {
  t.lockTrainingAttendance.mockRejectedValue(new Error('Bad request'));
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  await pressSpara();
  await confirmSave();

  expect(await screen.findByText('Närvaron kunde inte låsas. Försök igen.')).toBeTruthy();
  expect(screen.queryByText('Närvaro låst')).toBeNull();
  expect(screen.getByRole('button', { name: 'Spara' })).toBeEnabled();
});

test('a locked list is read-only and shows "Närvaro låst"', async () => {
  t.getTraining.mockResolvedValue({ ...training, attendanceLockedAt: '2026-11-12T19:05:00' });
  t.listTrainingAttendance.mockResolvedValue([
    { playerUserId: 11, playerName: 'Alva Berg', playerNumber: 7, status: 'PRESENT' },
    { playerUserId: 12, playerName: 'Bo Ek', playerNumber: 9, status: 'EXCUSED' },
    // Left out of an automatic lock: not shown.
    { playerUserId: 13, playerName: 'Cleo Lind', playerNumber: null, status: null },
  ]);
  await renderScreen();

  expect(await screen.findByText('Närvaro låst')).toBeTruthy();
  expect(player(11).getByText('Närvarande')).toBeTruthy();
  expect(player(12).getByText('Ledig')).toBeTruthy();
  expect(screen.queryByText('Cleo Lind')).toBeNull();
  expect(screen.queryByRole('button', { name: /Spara|Alva Berg|Bo Ek/ })).toBeNull();
});

test('shows grey placeholder rows until the list arrives', async () => {
  const list = deferred<AttendanceRow[]>();
  t.listTrainingAttendance.mockReturnValue(list.promise);
  await renderScreen();

  expect(screen.getByLabelText('Laddar')).toBeOnTheScreen();
  expect(screen.queryByText('Fotbollsträning')).toBeNull();

  await list.resolve(rows());

  expect(await screen.findByText('Fotbollsträning')).toBeTruthy();
  expect(screen.queryByLabelText('Laddar')).toBeNull();
});

test('shows the error instead of the placeholder when loading fails', async () => {
  const list = deferred<AttendanceRow[]>();
  t.listTrainingAttendance.mockReturnValue(list.promise);
  await renderScreen();

  await list.reject(new Error('Training not found'));

  expect(await screen.findByText('Training not found')).toBeTruthy();
  expect(screen.queryByLabelText('Laddar')).toBeNull();
});

describe('match', () => {
  test('uses the match calls and "Match mot" as title', async () => {
    await renderScreen('match', 8);

    expect(await screen.findByText('Match mot Öster')).toBeTruthy();
    expect(player(12).getByText('Närvarande')).toBeTruthy();
    expect(player(14).getByText('Ledig')).toBeTruthy();
  });

  test('confirming writes every mark with the match calls, then locks', async () => {
    await renderScreen('match', 8);
    await screen.findByText('Match mot Öster');

    await tap('Cleo Lind');
    await pressSpara();
    await confirmSave();

    await waitFor(() => expect(m.lockMatchAttendance).toHaveBeenCalledWith(8));
    expect(m.markMatchAttendance).toHaveBeenCalledTimes(3);
    expect(m.markMatchAttendance).toHaveBeenCalledWith(8, 11, 'ABSENT');
    expect(m.markMatchAttendance).toHaveBeenCalledWith(8, 12, 'PRESENT');
    expect(m.markMatchAttendance).toHaveBeenCalledWith(8, 13, 'ABSENT');
    expect(t.markTrainingAttendance).not.toHaveBeenCalled();
    expect(t.lockTrainingAttendance).not.toHaveBeenCalled();
    expect(await screen.findByText('Närvaro låst')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Spara' })).toBeNull();
  });

  test('a failed write does not lock the match', async () => {
    m.markMatchAttendance.mockRejectedValueOnce(new Error('Network request failed'));
    await renderScreen('match', 8);
    await screen.findByText('Match mot Öster');

    await pressSpara();
    await confirmSave();

    expect(await screen.findByText('Närvaron kunde inte sparas. Försök igen.')).toBeTruthy();
    expect(m.lockMatchAttendance).not.toHaveBeenCalled();
  });

  test('a locked match is read-only', async () => {
    m.getMatch.mockResolvedValue({ ...match, attendanceLockedAt: '2026-11-14T12:05:00' });
    m.listMatchAttendance.mockResolvedValue([
      { playerUserId: 11, playerName: 'Alva Berg', playerNumber: 7, status: 'ABSENT' },
    ]);
    await renderScreen('match', 8);

    expect(await screen.findByText('Närvaro låst')).toBeTruthy();
    expect(player(11).getByText('Frånvarande')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Spara|Alva Berg/ })).toBeNull();
  });
});

describe('attendance window (issue #124)', () => {
  test('31 minutes before start: shows the text and nothing to tap', async () => {
    now.mockReturnValue(localTime(2026, 11, 9, 16, 59));
    await renderScreen();

    expect(await screen.findByText('Närvaro öppnar 30 min före start')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Spara|Alva Berg|Bo Ek/ })).toBeNull();
  });

  test('30 minutes before start: rows and Spara show', async () => {
    now.mockReturnValue(localTime(2026, 11, 9, 17, 0));
    await renderScreen();

    expect(await screen.findByText('Fotbollsträning')).toBeTruthy();
    expect(screen.queryByText('Närvaro öppnar 30 min före start')).toBeNull();
    expect(screen.getByRole('button', { name: 'Bo Ek' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Spara' })).toBeTruthy();
  });

  test('match: uses kickoff for the window', async () => {
    now.mockReturnValue(localTime(2026, 11, 12, 10, 0));
    await renderScreen('match', 8);

    expect(await screen.findByText('Närvaro öppnar 30 min före start')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Spara|Bo Ek/ })).toBeNull();
  });
});

test('a 403 shows the Swedish message', async () => {
  const forbidden = await readErrorMessage(new Response('Access Denied', { status: 403 }));
  t.listTrainingAttendance.mockRejectedValue(new Error(forbidden));
  await renderScreen();

  expect(
    await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
  ).toBeTruthy();
});

test('pulling the list down loads the attendance again', async () => {
  await renderScreen();
  expect(await screen.findByText('2 närvarande · 1 frånvarande · 1 ledig')).toBeTruthy();

  // Another coach saved Bo as absent in the meantime.
  t.listTrainingAttendance.mockResolvedValue(
    rows().map((row) => (row.playerUserId === 12 ? { ...row, status: 'ABSENT' } : row)),
  );
  await pullToRefresh();

  expect(await screen.findByText('1 närvarande · 2 frånvarande · 1 ledig')).toBeTruthy();
  expect(t.listTrainingAttendance).toHaveBeenCalledTimes(2);
});

test('a failed refresh shows the same Swedish message', async () => {
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  const forbidden = await readErrorMessage(new Response('Access Denied', { status: 403 }));
  t.listTrainingAttendance.mockRejectedValue(new Error(forbidden));
  await pullToRefresh();

  expect(
    await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
  ).toBeTruthy();
});
