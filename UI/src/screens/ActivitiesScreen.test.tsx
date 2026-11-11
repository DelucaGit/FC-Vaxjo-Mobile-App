import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { listMatchAttendance, listMatches } from '../api/matches';
import { listMyTeams, listTeams } from '../api/teams';
import { listTrainingAttendance, listTrainings } from '../api/trainings';
import ActivitiesScreen from './ActivitiesScreen';

jest.mock('../api/teams', () => ({ listTeams: jest.fn(), listMyTeams: jest.fn() }));
jest.mock('../api/trainings', () => ({
  listTrainings: jest.fn(),
  listTrainingAttendance: jest.fn(),
}));
jest.mock('../api/matches', () => ({ listMatches: jest.fn(), listMatchAttendance: jest.fn() }));

let mockRole = 'COACH';
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { roleName: mockRole } }),
}));

// Outside a navigator, run the focus effect like a normal effect.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const props = { navigation, route: { key: 'a', name: 'Activities' } } as unknown as Parameters<
  typeof ActivitiesScreen
>[0];

const training = {
  id: 1,
  teamId: 10,
  teamName: 'P2014',
  startsAt: '2020-11-10T17:30:00',
  endsAt: '2020-11-10T19:00:00',
  type: 'FOOTBALL',
  venue: 'Konstgräset',
  status: 'SCHEDULED',
  cancelReason: null,
  createdByUserId: 1,
  attendanceLockedAt: null,
};

beforeEach(() => {
  mockRole = 'COACH';
  jest.mocked(listMyTeams).mockResolvedValue([{ id: 10, name: 'P2014' }]);
  jest.mocked(listTeams).mockResolvedValue([
    { id: 10, name: 'P2014' },
    { id: 20, name: 'F2015' },
  ]);
  jest.mocked(listTrainings).mockResolvedValue([]);
  jest.mocked(listMatches).mockResolvedValue([]);
  jest.mocked(listTrainingAttendance).mockResolvedValue([]);
  jest.mocked(listMatchAttendance).mockResolvedValue([]);
});

test('lists trainings and matches per week with their status', async () => {
  jest.mocked(listTrainings).mockResolvedValue([
    training as never,
    {
      ...training,
      id: 2,
      type: 'FITNESS',
      startsAt: '2020-11-11T17:30:00',
      endsAt: '2020-11-11T19:00:00',
      status: 'CANCELLED',
      cancelReason: 'Snö',
    } as never,
  ]);
  jest.mocked(listMatches).mockResolvedValue([
    {
      id: 1,
      teamId: 10,
      teamName: 'P2014',
      opponent: 'Östers IF',
      kickoffAt: '2020-11-21T10:00:00',
      venue: 'Värendsvallen',
      homeAway: 'AWAY',
      result: { goalsFor: 3, goalsAgainst: 1 },
      createdByUserId: 1,
      attendanceLockedAt: '2020-11-21T19:05:00',
    },
  ]);
  jest.mocked(listTrainingAttendance).mockResolvedValue([
    { playerUserId: 1, playerName: 'A', playerNumber: 7, status: 'PRESENT' },
    { playerUserId: 2, playerName: 'B', playerNumber: 8, status: null },
    { playerUserId: 3, playerName: 'C', playerNumber: 9, status: null },
  ]);

  await render(<ActivitiesScreen {...props} />);

  expect(await screen.findByText('2 ej markerade')).toBeTruthy();
  expect(screen.getByText('Vecka 46')).toBeTruthy();
  expect(screen.getByText('Vecka 47')).toBeTruthy();
  expect(screen.getByText('P2014')).toBeTruthy();

  const cancelled = screen.getByTestId('activity-training-2');
  expect(within(cancelled).getByText('Inställd · Snö')).toBeTruthy();
  expect(within(cancelled).getByText('Fysträning')).toHaveStyle({ textDecorationLine: 'line-through' });

  const matchRow = screen.getByTestId('activity-match-1');
  expect(within(matchRow).getByText('Match mot Östers IF')).toBeTruthy();
  expect(within(matchRow).getByText('3–1')).toBeTruthy();
  expect(within(matchRow).getByText('Värendsvallen · Borta')).toBeTruthy();
  expect(within(matchRow).getByText('Närvaro låst')).toBeTruthy();

  // Only the started, open, active training needs an attendance call.
  expect(listTrainingAttendance).toHaveBeenCalledTimes(1);
  expect(listTrainingAttendance).toHaveBeenCalledWith(1);
  expect(listMatchAttendance).not.toHaveBeenCalled();

  await fireEvent.press(matchRow);
  expect(navigation.navigate).toHaveBeenCalledWith('ActivityDetail', { kind: 'match', id: 1 });
  expect(screen.queryByText('Ny träning')).toBeNull();
  await fireEvent.press(screen.getByText('Lägg till fotbollsträning'));
  expect(navigation.navigate).toHaveBeenCalledWith('NewTraining', { teamId: 10, type: 'FOOTBALL' });
  await fireEvent.press(screen.getByText('Lägg till fysträning'));
  expect(navigation.navigate).toHaveBeenCalledWith('NewTraining', { teamId: 10, type: 'FITNESS' });
  await fireEvent.press(screen.getByText('Ny match'));
  expect(navigation.navigate).toHaveBeenCalledWith('NewMatch', { teamId: 10 });
});

test('a chairman picks among all teams', async () => {
  mockRole = 'CHAIRMAN';
  await render(<ActivitiesScreen {...props} />);

  expect(await screen.findByText('Inga aktiviteter')).toBeTruthy();
  expect(listMyTeams).not.toHaveBeenCalled();
  expect(listTrainings).toHaveBeenLastCalledWith(10);

  await fireEvent.press(screen.getByRole('radio', { name: 'F2015' }));
  await screen.findByText('Inga aktiviteter');
  expect(listTrainings).toHaveBeenLastCalledWith(20);
  expect(listMatches).toHaveBeenLastCalledWith(20);
});

test('shows the error message from the API', async () => {
  jest.mocked(listTrainings).mockRejectedValue(
    new Error('Den här funktionen är inte tillgänglig för din roll än.'),
  );
  await render(<ActivitiesScreen {...props} />);
  expect(
    await screen.findByText('Den här funktionen är inte tillgänglig för din roll än.'),
  ).toBeTruthy();
});
