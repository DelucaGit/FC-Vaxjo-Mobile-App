import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { readErrorMessage } from '../api/http';
import * as matches from '../api/matches';
import * as trainings from '../api/trainings';
import type { AttendanceRow } from '../api/trainings';
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

function rows(): AttendanceRow[] {
  return [
    { playerUserId: 11, playerName: 'Alva Berg', playerNumber: 7, status: 'PRESENT' },
    { playerUserId: 12, playerName: 'Bo Ek', playerNumber: 9, status: null },
    { playerUserId: 13, playerName: 'Cleo Lind', playerNumber: null, status: null },
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

/** Local time, the same way the app reads the API's date-time strings. */
function localTime(year: number, month: number, day: number, hour: number, minute: number): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

/** The screen reads "now" from Date.now(). A fixed value keeps the tests stable. */
let now: jest.SpyInstance<number, []>;

beforeEach(() => {
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
});

test('shows header, counter and the Klar button locked while players are unmarked', async () => {
  await renderScreen();

  expect(await screen.findByText('Fotbollsträning')).toBeTruthy();
  expect(screen.getByText('Mån 9 nov · 17:30–19:00')).toBeTruthy();
  expect(screen.getByText(/1 närvarande · 0 frånvarande · 0 ursäktad/)).toBeTruthy();
  expect(screen.getByText('2 ej markerade')).toBeTruthy();
  expect(player(11).getByText('#7')).toBeTruthy();
  expect(screen.getByRole('button', { name: '2 spelare kvar att markera' })).toBeDisabled();
});

test('marking a player updates the row at once and calls the API', async () => {
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  await fireEvent.press(player(12).getByRole('radio', { name: 'Frånvarande' }));

  expect(player(12).getByRole('radio', { name: 'Frånvarande' })).toBeChecked();
  expect(t.markTrainingAttendance).toHaveBeenCalledWith(5, 12, 'ABSENT');
  expect(screen.getByText('1 ej markerade')).toBeTruthy();

  // Change an already marked player.
  await fireEvent.press(player(11).getByRole('radio', { name: 'Ursäktad' }));
  expect(t.markTrainingAttendance).toHaveBeenCalledWith(5, 11, 'EXCUSED');
  expect(screen.getByText(/0 närvarande · 1 frånvarande · 1 ursäktad/)).toBeTruthy();
});

test('a failed mark goes back and shows the message', async () => {
  t.markTrainingAttendance.mockRejectedValueOnce(new Error('This training is cancelled'));
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  await fireEvent.press(player(12).getByRole('radio', { name: 'Närvarande' }));

  expect(await screen.findByText('This training is cancelled')).toBeTruthy();
  expect(player(12).getByRole('radio', { name: 'Närvarande' })).not.toBeChecked();
  expect(screen.getByText('2 ej markerade')).toBeTruthy();
});

test('"Markera alla närvarande" marks the rest, then Klar asks and locks', async () => {
  t.lockTrainingAttendance.mockResolvedValue({
    ...training,
    attendanceLockedAt: '2026-11-12T19:05:00',
  });
  await renderScreen();
  await screen.findByText('Fotbollsträning');

  await fireEvent.press(screen.getByRole('button', { name: 'Markera alla närvarande' }));

  expect(t.markTrainingAttendance).toHaveBeenCalledTimes(2);
  expect(t.markTrainingAttendance).toHaveBeenCalledWith(5, 12, 'PRESENT');
  expect(t.markTrainingAttendance).toHaveBeenCalledWith(5, 13, 'PRESENT');
  expect(screen.getByRole('button', { name: 'Markera alla närvarande' })).toBeDisabled();

  const klar = await screen.findByRole('button', { name: 'Klar' });
  await waitFor(() => expect(klar).toBeEnabled());
  await fireEvent.press(klar);

  expect(screen.getByText('Låsa närvaron?')).toBeTruthy();
  expect(screen.getByText('Den går inte att ändra efteråt.')).toBeTruthy();
  expect(t.lockTrainingAttendance).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: 'Lås närvaron' }));

  expect(t.lockTrainingAttendance).toHaveBeenCalledWith(5);
  expect(await screen.findByText('Låst 12 nov 19:05')).toBeTruthy();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Klar' })).toBeNull();
});

test('a locked list shows status as text and no buttons', async () => {
  t.getTraining.mockResolvedValue({ ...training, attendanceLockedAt: '2026-11-12T19:05:00' });
  t.listTrainingAttendance.mockResolvedValue([
    { playerUserId: 11, playerName: 'Alva Berg', playerNumber: 7, status: 'PRESENT' },
    { playerUserId: 12, playerName: 'Bo Ek', playerNumber: 9, status: 'EXCUSED' },
    // Left out of an automatic lock: not shown.
    { playerUserId: 13, playerName: 'Cleo Lind', playerNumber: null, status: null },
  ]);
  await renderScreen();

  expect(await screen.findByText('Låst 12 nov 19:05')).toBeTruthy();
  expect(player(11).getByText('Närvarande')).toBeTruthy();
  expect(player(12).getByText('Ursäktad')).toBeTruthy();
  expect(screen.queryByText('Cleo Lind')).toBeNull();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByRole('button', { name: /Klar|kvar att markera|Markera alla/ })).toBeNull();
});

test('match: uses the match calls and "Match mot" as title', async () => {
  m.getMatch.mockResolvedValue({
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
  });
  m.listMatchAttendance.mockResolvedValue(rows());
  m.markMatchAttendance.mockResolvedValue(rows()[1]);
  await renderScreen('match', 8);

  expect(await screen.findByText('Match mot Öster')).toBeTruthy();
  await fireEvent.press(player(12).getByRole('radio', { name: 'Närvarande' }));
  expect(m.markMatchAttendance).toHaveBeenCalledWith(8, 12, 'PRESENT');
  expect(t.markTrainingAttendance).not.toHaveBeenCalled();
});

afterEach(() => {
  now.mockRestore();
});

describe('attendance window (issue #124)', () => {
  test('31 minutes before start: shows the text and no buttons', async () => {
    now.mockReturnValue(localTime(2026, 11, 9, 16, 59));
    await renderScreen();

    expect(await screen.findByText('Närvaro öppnar 30 min före start')).toBeTruthy();
    expect(player(11).getByText('Närvarande')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('button', { name: /Klar|kvar att markera|Markera alla/ })).toBeNull();
  });

  test('30 minutes before start: the buttons show', async () => {
    now.mockReturnValue(localTime(2026, 11, 9, 17, 0));
    await renderScreen();

    expect(await screen.findByText('Fotbollsträning')).toBeTruthy();
    expect(screen.queryByText('Närvaro öppnar 30 min före start')).toBeNull();
    expect(player(12).getByRole('radio', { name: 'Närvarande' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Markera alla närvarande' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '2 spelare kvar att markera' })).toBeTruthy();
  });

  test('match: uses kickoff for the window', async () => {
    now.mockReturnValue(localTime(2026, 11, 12, 10, 0));
    m.getMatch.mockResolvedValue({
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
    });
    m.listMatchAttendance.mockResolvedValue(rows());
    await renderScreen('match', 8);

    expect(await screen.findByText('Närvaro öppnar 30 min före start')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
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
  expect(await screen.findByText('2 ej markerade')).toBeTruthy();

  // Another coach marked Bo in the meantime.
  t.listTrainingAttendance.mockResolvedValue(
    rows().map((row) => (row.playerUserId === 12 ? { ...row, status: 'ABSENT' } : row)),
  );
  await pullToRefresh();

  expect(await screen.findByText('1 ej markerade')).toBeTruthy();
  expect(t.listTrainingAttendance).toHaveBeenCalledTimes(2);
});

test('a failed refresh shows the same Swedish message', async () => {
  await renderScreen();
  expect(await screen.findByText('2 ej markerade')).toBeTruthy();

  const forbidden = await readErrorMessage(new Response('Access Denied', { status: 403 }));
  t.listTrainingAttendance.mockRejectedValue(new Error(forbidden));
  await pullToRefresh();

  expect(
    await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
  ).toBeTruthy();
});
