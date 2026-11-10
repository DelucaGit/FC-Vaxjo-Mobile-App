import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { readErrorMessage } from '../api/http';
import * as matches from '../api/matches';
import * as trainings from '../api/trainings';
import type { AttendanceRow } from '../api/trainings';
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

// The first render loads the icon library, which is slow on a cold cache.
jest.setTimeout(30000);

const t = jest.mocked(trainings);
const m = jest.mocked(matches);

const training: trainings.Training = {
  id: 5,
  teamId: 1,
  teamName: 'P12 Alfa',
  startsAt: '2026-11-09T17:30:00',
  endsAt: '2026-11-09T19:00:00',
  title: 'Träning',
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

beforeEach(() => {
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

  expect(await screen.findByText('Träning')).toBeTruthy();
  expect(screen.getByText('Mån 9 nov · 17:30–19:00')).toBeTruthy();
  expect(screen.getByText(/1 närvarande · 0 frånvarande · 0 ursäktad/)).toBeTruthy();
  expect(screen.getByText('2 ej markerade')).toBeTruthy();
  expect(player(11).getByText('#7')).toBeTruthy();
  expect(screen.getByRole('button', { name: '2 spelare kvar att markera' })).toBeDisabled();
});

test('marking a player updates the row at once and calls the API', async () => {
  await renderScreen();
  await screen.findByText('Träning');

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
  await screen.findByText('Träning');

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
  await screen.findByText('Träning');

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

test('a 403 shows the Swedish message', async () => {
  const forbidden = await readErrorMessage(new Response('Access Denied', { status: 403 }));
  t.listTrainingAttendance.mockRejectedValue(new Error(forbidden));
  await renderScreen();

  expect(
    await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
  ).toBeTruthy();
});
